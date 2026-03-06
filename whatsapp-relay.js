#!/usr/bin/env node
// whatsapp-relay.js v3
// Lee log OpenClaw → detecta msgs WA → escribe en Supabase (wa_messages)
// NO hace getUpdates → elimina el error 409
// Solo usa sendMessage para notificar a TG

const fs    = require('fs');
const https = require('https');

const TG_TOKEN  = '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
const TG_CHAT   = '596831448';
const SB_URL    = 'ztigttazrdzkpxrzyast.supabase.co';
const SB_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWd0dGF6cmR6a3B4cnp5YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTg5MzcsImV4cCI6MjA4NzU5NDkzN30.d-PQ0S_dXsTRXGdRrZDJiJOXcXFF4hEOaAGWpT3WaSM';

const today    = new Date().toISOString().split('T')[0];
const LOG_FILE = `/tmp/openclaw/openclaw-${today}.log`;

// Dedup
const seen = new Set();
function isDupe(key) {
  const k = key.slice(0,120);
  if (seen.has(k)) return true;
  seen.add(k);
  if (seen.size > 200) seen.delete(seen.values().next().value);
  return false;
}

function httpsPost(hostname, path, data, extraHeaders) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const headers = { 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body), ...(extraHeaders||{}) };
    const req = https.request({ hostname, path, method:'POST', headers }, res => {
      let raw=''; res.on('data',c=>raw+=c); res.on('end',()=>{ try{resolve(JSON.parse(raw))}catch{resolve({})} });
    });
    req.on('error', ()=>resolve({}));
    req.write(body); req.end();
  });
}

function tgSend(text) {
  return httpsPost('api.telegram.org', `/bot${TG_TOKEN}/sendMessage`,
    { chat_id:TG_CHAT, text:text.substring(0,4000), parse_mode:'HTML' });
}

async function sbInsertWA(direction, text) {
  const data = {
    id: String(Date.now())+Math.random().toString(36).slice(2,6),
    direction,
    text: text.substring(0,4000),
    created_at: new Date().toISOString()
  };
  try {
    await httpsPost(SB_URL, '/rest/v1/wa_messages', data, {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Prefer': 'return=minimal'
    });
    console.log(`💾 SB[${direction}]: ${text.substring(0,60)}`);
  } catch(e) { console.error('SB error:', e.message); }
}

async function processLine(line) {
  if (!line.trim()) return;
  try {
    const obj       = JSON.parse(line);
    const subsystem = typeof obj['0']==='string' ? obj['0'] : JSON.stringify(obj['0']);
    const data      = obj['1'];
    const extra     = obj['2'] || '';

    if (subsystem.includes('web-auto-reply') && data && data.body) {
      const clean = (data.body||'').replace(/\[WhatsApp[^\]]*\]\s*/g,'').trim();
      if (clean && !isDupe('in:'+clean)) {
        console.log(`📱 Tú: ${clean.substring(0,80)}`);
        await sbInsertWA('in', clean);
        await tgSend(`📱 <b>Tú (WhatsApp):</b>\n${clean}`);
      }
    }
    if (subsystem.includes('web-auto-reply') && data && data.text) {
      const clean = (data.text||'').replace(/\[openclaw\]/g,'').trim();
      if (clean && !isDupe('out:'+clean)) {
        console.log(`🤖 Bot: ${clean.substring(0,80)}`);
        await sbInsertWA('out', clean);
        await tgSend(`🤖 <b>Arditi (WhatsApp):</b>\n${clean}`);
      }
    }
    if (subsystem.includes('gateway/channels/whatsapp/outbound') && extra==='auto-reply sent (text)' && data && data.text) {
      const clean = (data.text||'').replace(/\[openclaw\]/g,'').trim();
      if (clean && !clean.includes('web-auto-reply') && !isDupe('out2:'+clean)) {
        console.log(`🤖 Bot(gw): ${clean.substring(0,80)}`);
        await sbInsertWA('out', clean);
        await tgSend(`🤖 <b>Arditi (WhatsApp):</b>\n${clean}`);
      }
    }
  } catch(e) {}
}

let lastSize=0, lineBuffer='';
function checkLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const stat = fs.statSync(LOG_FILE);
    if (stat.size <= lastSize) return;
    const buf = Buffer.alloc(stat.size - lastSize);
    const fd  = fs.openSync(LOG_FILE,'r');
    fs.readSync(fd, buf, 0, buf.length, lastSize);
    fs.closeSync(fd);
    lastSize = stat.size;
    lineBuffer += buf.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer  = lines.pop();
    for (const l of lines) processLine(l);
  } catch(e) {}
}

try {
  if (fs.existsSync(LOG_FILE)) {
    lastSize = fs.statSync(LOG_FILE).size;
    console.log(`📋 Log: ${LOG_FILE} (${lastSize} bytes)`);
  }
} catch(e) {}

console.log('');
console.log('🦞 WhatsApp Relay v3');
console.log('──────────────────────────────────────');
console.log('✅ Lee log OpenClaw → Supabase wa_messages');
console.log('✅ Notifica a Telegram (solo sendMessage)');
console.log('❌ Sin getUpdates → CORRIGE error 409');
console.log('──────────────────────────────────────');
console.log('');

setInterval(checkLog, 800);
process.on('SIGINT', ()=>{ console.log('\n👋 Detenido'); process.exit(0); });
