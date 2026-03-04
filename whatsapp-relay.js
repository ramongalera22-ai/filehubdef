#!/usr/bin/env node
// whatsapp-relay.js — Lee el log de OpenClaw y reenvía mensajes de WhatsApp a Telegram
// Ejecutar en NucBox: node ~/whatsapp-relay.js &

const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

const TG_TOKEN = '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
const TG_CHAT = '596831448';

// Get today's log file
const today = new Date().toISOString().split('T')[0];
const LOG_FILE = `/tmp/openclaw/openclaw-${today}.log`;

function tgSend(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ 
      chat_id: TG_CHAT, 
      text: text.substring(0, 4000), 
      parse_mode: 'HTML' 
    });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TG_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Content-Length': Buffer.byteLength(body) 
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

let lastSize = 0;
let lineBuffer = '';
let lastSentTime = 0;
let pendingResponse = '';
let collectingResponse = false;
let collectTimeout = null;

async function flushResponse() {
  if (!pendingResponse.trim()) return;
  const msg = pendingResponse.trim();
  pendingResponse = '';
  collectingResponse = false;
  
  console.log(`📨 Enviando a Telegram: ${msg.substring(0, 80)}...`);
  await tgSend(`📱 <b>WhatsApp → Dashboard:</b>\n\n${msg}`);
  lastSentTime = Date.now();
}

async function processLines(lines) {
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Detect WhatsApp outbound (OpenClaw responding to WhatsApp user)
    if (line.includes('[whatsapp]') && (
      line.includes('outbound') || 
      line.includes('sending') || 
      line.includes('reply') ||
      line.includes('response')
    )) {
      console.log('WA line:', line.substring(0, 120));
    }

    // Detect agent output lines (the actual response content)
    // OpenClaw logs agent responses after processing
    if (line.includes('[agent]') || line.includes('[response]')) {
      console.log('Agent line:', line.substring(0, 120));
    }
  }
}

function checkLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      console.log(`⏳ Esperando log: ${LOG_FILE}`);
      return;
    }
    
    const stat = fs.statSync(LOG_FILE);
    if (stat.size <= lastSize) return;
    
    const newContent = fs.readFileSync(LOG_FILE).slice(lastSize).toString();
    lastSize = stat.size;
    
    lineBuffer += newContent;
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop();
    
    processLines(lines);
  } catch(e) {
    console.error('Log error:', e.message);
  }
}

// Initialize with current file size
try {
  if (fs.existsSync(LOG_FILE)) {
    lastSize = fs.statSync(LOG_FILE).size;
    console.log(`📋 Log encontrado, monitorizando desde posición ${lastSize}`);
  }
} catch(e) {}

console.log('🔄 WhatsApp Relay v1.0 iniciado');
console.log(`📋 Log: ${LOG_FILE}`);
console.log(`📨 Telegram chat: ${TG_CHAT}`);
console.log('');
console.log('Esperando mensajes de WhatsApp...');

setInterval(checkLog, 500);

process.on('SIGINT', () => {
  console.log('\n👋 Relay detenido');
  process.exit(0);
});
