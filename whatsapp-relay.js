#!/usr/bin/env node
// WhatsApp Relay v4 — patrones correctos confirmados del log JSON de OpenClaw

const fs    = require('fs');
const https = require('https');

const TG_TOKEN = '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
const TG_CHAT  = '596831448';
const SB_URL   = 'ztigttazrdzkpxrzyast.supabase.co';
const SB_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWd0dGF6cmR6a3B4cnp5YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTg5MzcsImV4cCI6MjA4NzU5NDkzN30.d-PQ0S_dXsTRXGdRrZDJiJOXcXFF4hEOaAGWpT3WaSM';

const today    = new Date().toISOString().split('T')[0];
const LOG_FILE = `/tmp/openclaw/openclaw-${today}.log`;

const seen = new Set();
function isDupe(key) {
  const k = key.slice(0, 120);
  if (seen.has(k)) return true;
  seen.add(k);
  if (seen.size > 300) seen.delete(seen.values().next().value);
  return false;
}

function httpsPost(hostname, path, data, extraHeaders) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(extraHeaders || {})
    };
    const req = https.request({ hostname, path, method: 'POST', headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(body);
    req.end();
  });
}

async function sbInsert(direction, text) {
  const r = await httpsPost(SB_URL, '/rest/v1/wa_messages',
    { direction, text, created_at: new Date().toISOString() },
    { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'return=minimal' }
  );
  if (r.status >= 200 && r.status < 300) {
    console.log(`💾 SB[${direction}]: ${text.substring(0, 60)}`);
  } else {
    console.error(`❌ SB error ${r.status}: ${r.body.substring(0, 100)}`);
  }
}

async function tgSend(text) {
  await httpsPost('api.telegram.org', `/bot${TG_TOKEN}/sendMessage`,
    { chat_id: TG_CHAT, text, parse_mode: 'HTML' }
  );
}

async function processLine(line) {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    const sub  = typeof obj['0'] === 'string' ? obj['0'] : '';
    const data = obj['1'];
    const msg2 = obj['2'] || '';

    // ── RESPUESTA DEL BOT (web-auto-reply, campo text) ───────
    // Formato confirmado: {"0":"{\"module\":\"web-auto-reply\",...}", "1":{"text":"[openclaw] ...", "to":"+34...", "from":"+34..."}, "2":"auto-reply sent (text)"}
    if (sub.includes('web-auto-reply') && msg2 === 'auto-reply sent (text)' && data && data.text) {
      const raw = String(data.text);
      
      // El campo "from" y "to" son iguales cuando es auto-reply al mismo número
      // Distinguimos: si el texto empieza con [openclaw] es respuesta del bot
      const isBot = raw.startsWith('[openclaw]');
      const clean = raw.replace(/^\[openclaw\]\s*/, '').trim();
      
      if (clean && !isDupe((isBot ? 'bot:' : 'usr:') + clean)) {
        if (isBot) {
          console.log(`🤖 BOT: ${clean.substring(0, 80)}`);
          await sbInsert('out', clean);
        } else {
          // Mensaje sin prefijo [openclaw] = mensaje del usuario
          console.log(`📱 USR: ${clean.substring(0, 80)}`);
          await sbInsert('in', clean);
          await tgSend(`📱 <b>Tú (WhatsApp):</b>\n${clean}`);
        }
      }
    }

    // ── MENSAJE ENTRANTE (inbound, campo body si existe) ─────
    // Algunos logs tienen el mensaje entrante con subsystem whatsapp/inbound
    if (sub.includes('whatsapp') && data && typeof data === 'object') {
      if (data.body && !sub.includes('outbound')) {
        const clean = String(data.body).replace(/\[WhatsApp[^\]]*\]\s*/g, '').trim();
        if (clean && !isDupe('inb:' + clean)) {
          console.log(`📱 INB: ${clean.substring(0, 80)}`);
          await sbInsert('in', clean);
          await tgSend(`📱 <b>Tú (WhatsApp):</b>\n${clean}`);
        }
      }
    }

  } catch(e) { /* ignore JSON parse errors */ }
}

let lastSize = 0, lineBuffer = '';
function checkLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const stat = fs.statSync(LOG_FILE);
    if (stat.size <= lastSize) return;
    const buf = Buffer.alloc(stat.size - lastSize);
    const fd  = fs.openSync(LOG_FILE, 'r');
    fs.readSync(fd, buf, 0, buf.length, lastSize);
    fs.closeSync(fd);
    lastSize = stat.size;
    lineBuffer += buf.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer  = lines.pop();
    for (const l of lines) processLine(l);
  } catch(e) {}
}

// Init — skip existing log content
try {
  if (fs.existsSync(LOG_FILE)) {
    lastSize = fs.statSync(LOG_FILE).size;
    console.log(`📋 Log: ${LOG_FILE} (${lastSize} bytes, skipping history)`);
  }
} catch(e) {}

console.log('');
console.log('🦞 WhatsApp Relay v4');
console.log('──────────────────────────────────────');
console.log('✅ Patrón: web-auto-reply → SB wa_messages');
console.log('✅ Telegram: solo sendMessage (sin getUpdates)');
console.log('❌ Sin error 409');
console.log('──────────────────────────────────────');
console.log('');

setInterval(checkLog, 800);
process.on('SIGINT', () => { console.log('\n👋 Detenido'); process.exit(0); });
