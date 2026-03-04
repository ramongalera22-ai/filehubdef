#!/usr/bin/env node
// whatsapp-relay.js — Lee log de OpenClaw y reenvía WA a Telegram para el dashboard
// Ejecutar: node ~/whatsapp-relay.js &

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
    }, res => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', resolve);
    req.write(body); req.end();
  });
}

let lastSize = 0;
let lineBuffer = '';

async function processLine(line) {
  try {
    const obj = JSON.parse(line);
    const name = obj['0'] || '';
    const data = obj['1'];
    const msg2 = obj['2'] || '';

    // INBOUND: mensaje tuyo desde WhatsApp
    if (typeof name === 'string' && name.includes('web-auto-reply') && 
        typeof data === 'object' && data.body && data.body.includes('[WhatsApp')) {
      // Extract clean message (remove the [WhatsApp ...] prefix)
      const body = data.body.replace(/\[WhatsApp[^\]]*\]\s*/,'').trim();
      if (body) {
        console.log(`📱 WA entrada: ${body.substring(0, 80)}`);
        await tgSend(`📱 <b>Tú (WhatsApp):</b>\n${body}`);
      }
    }

    // OUTBOUND: respuesta de Arditi a WhatsApp  
    if (typeof name === 'string' && name.includes('web-auto-reply') && 
        typeof data === 'object' && data.text && data.text.includes('[openclaw]')) {
      const text = data.text.replace('[openclaw]','').trim();
      if (text) {
        console.log(`🤖 WA salida: ${text.substring(0, 80)}`);
        await tgSend(`🤖 <b>Arditi (WhatsApp):</b>\n${text}`);
      }
    }

  } catch(e) {} // skip non-JSON lines
}

function checkLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const stat = fs.statSync(LOG_FILE);
    if (stat.size <= lastSize) return;

    const newContent = fs.readFileSync(LOG_FILE).slice(lastSize).toString();
    lastSize = stat.size;

    lineBuffer += newContent;
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop();
    lines.forEach(processLine);
  } catch(e) { console.error('Error:', e.message); }
}

// Init at current file end (don't replay old messages)
try {
  if (fs.existsSync(LOG_FILE)) {
    lastSize = fs.statSync(LOG_FILE).size;
    console.log(`📋 Log encontrado (${lastSize} bytes). Monitorizando nuevos mensajes...`);
  }
} catch(e) {}

console.log('🔄 WhatsApp Relay activo');
console.log(`📨 Reenviando WA → Telegram chat ${TG_CHAT}`);
console.log('Escríbete por WhatsApp para probar...\n');

setInterval(checkLog, 800);
process.on('SIGINT', () => { console.log('\n👋 Relay detenido'); process.exit(0); });
