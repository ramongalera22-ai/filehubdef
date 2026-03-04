#!/usr/bin/env node
// whatsapp-relay.js v2 — detecta mensajes WA en log y los reenvía a Telegram

const fs = require('fs');
const https = require('https');

const TG_TOKEN = '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
const TG_CHAT = '596831448';
const today = new Date().toISOString().split('T')[0];
const LOG_FILE = `/tmp/openclaw/openclaw-${today}.log`;

function tgSend(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: TG_CHAT, text: text.substring(0, 4000), parse_mode: 'HTML' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TG_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', resolve);
    req.write(body); req.end();
  });
}

let lastSize = 0;
let lineBuffer = '';
let pendingText = null;
let pendingTimer = null;

async function processLine(line) {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    const subsystem = typeof obj['0'] === 'string' ? obj['0'] : JSON.stringify(obj['0']);
    const data = obj['1'];
    const extra = obj['2'] || '';

    // INBOUND: tu mensaje desde WhatsApp
    // Format: subsystem=web-auto-reply, data.body contains "[WhatsApp ...]"
    if (subsystem.includes('web-auto-reply') && data && data.body) {
      const raw = data.body || '';
      const clean = raw.replace(/\[WhatsApp[^\]]*\]\s*/g, '').trim();
      if (clean) {
        console.log(`📱 Tú: ${clean.substring(0, 80)}`);
        await tgSend(`📱 <b>Tú (WhatsApp):</b>\n${clean}`);
      }
    }

    // OUTBOUND: respuesta de Arditi — tiene "text" con "[openclaw]"
    if (subsystem.includes('web-auto-reply') && data && data.text) {
      const raw = data.text || '';
      const clean = raw.replace(/\[openclaw\]/g, '').trim();
      if (clean) {
        console.log(`🤖 Arditi: ${clean.substring(0, 80)}`);
        await tgSend(`🤖 <b>Arditi (WhatsApp):</b>\n${clean}`);
      }
    }

    // Also catch outbound via gateway/channels/whatsapp/outbound + auto-reply sent
    if (subsystem.includes('gateway/channels/whatsapp/outbound') && extra === 'auto-reply sent (text)' && data && data.text) {
      const clean = (data.text || '').replace(/\[openclaw\]/g, '').trim();
      if (clean && !clean.includes('web-auto-reply')) {
        console.log(`🤖 Arditi (outbound): ${clean.substring(0, 80)}`);
        await tgSend(`🤖 <b>Arditi (WhatsApp):</b>\n${clean}`);
      }
    }

  } catch(e) {
    // Not JSON, skip
  }
}

function checkLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const stat = fs.statSync(LOG_FILE);
    if (stat.size <= lastSize) return;

    const buf = Buffer.alloc(stat.size - lastSize);
    const fd = fs.openSync(LOG_FILE, 'r');
    fs.readSync(fd, buf, 0, buf.length, lastSize);
    fs.closeSync(fd);
    lastSize = stat.size;

    lineBuffer += buf.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop();
    for (const line of lines) processLine(line);
  } catch(e) {}
}

// Start from end of current log
try {
  if (fs.existsSync(LOG_FILE)) {
    lastSize = fs.statSync(LOG_FILE).size;
    console.log(`📋 Log: ${LOG_FILE} (${lastSize} bytes)`);
  }
} catch(e) {}

console.log('🔄 WhatsApp Relay v2 activo');
console.log(`📨 → Telegram ${TG_CHAT}`);
console.log('Escríbete por WhatsApp...\n');

setInterval(checkLog, 800);
process.on('SIGINT', () => { console.log('\n👋 Detenido'); process.exit(0); });
