#!/usr/bin/env node
// openclaw-server.js — Ejecutar en NucBox: node ~/openclaw-server.js
// Servidor HTTPS que recibe mensajes del dashboard y los envía a OpenClaw

const https = require('https');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3443;
const CHAT_ID = '596831448';
const CERT_KEY = path.join(process.env.HOME, '.openclaw-server-key.pem');
const CERT_CRT = path.join(process.env.HOME, '.openclaw-server-cert.pem');

// ── Generate self-signed cert if missing ────────────────────────────────────
function ensureCert() {
  if (!fs.existsSync(CERT_KEY) || !fs.existsSync(CERT_CRT)) {
    console.log('🔐 Generando certificado autofirmado...');
    execSync(
      `openssl req -x509 -newkey rsa:2048 \
       -keyout "${CERT_KEY}" -out "${CERT_CRT}" \
       -days 730 -nodes \
       -subj "/CN=nucbox-openclaw"`,
      { stdio: 'pipe' }
    );
    console.log('✅ Certificado generado');
  }
}

// ── Call OpenClaw agent ──────────────────────────────────────────────────────
function callOpenClaw(message, sessionId) {
  return new Promise((resolve) => {
    const escaped = message.replace(/'/g, "'\\''");
    const cmd = `openclaw agent --channel telegram --to ${CHAT_ID} --session-id ${sessionId} -m '${escaped}'`;

    exec(cmd, { timeout: 50000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && !stdout) {
        console.error('OpenClaw error:', err.message);
        resolve({ reply: '❌ Error ejecutando OpenClaw: ' + err.message });
        return;
      }
      const output = (stdout || '').trim();
      resolve({ reply: output || 'El agente procesó tu mensaje. Revisa Telegram para la respuesta.' });
    });
  });
}

// ── HTTP Server ──────────────────────────────────────────────────────────────
function startServer() {
  ensureCert();

  const key = fs.readFileSync(CERT_KEY);
  const cert = fs.readFileSync(CERT_CRT);

  const server = https.createServer({ key, cert }, (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', bot: '@arddiitibot', model: 'kimi-k2.5' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/chat') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { message, sessionId = 'dashboard-chat' } = JSON.parse(body);
          if (!message) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No message provided' }));
            return;
          }

          console.log(`💬 [${new Date().toLocaleTimeString()}] "${message.slice(0, 60)}..."`);
          res.writeHead(200);

          const result = await callOpenClaw(message, sessionId);
          console.log(`🤖 Reply: "${result.reply.slice(0, 60)}..."`);
          res.end(JSON.stringify(result));

        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🦞 OpenClaw Dashboard Bridge');
    console.log(`✅ Servidor HTTPS en puerto ${PORT}`);
    console.log(`🔗 URL Tailscale: https://100.69.142.77:${PORT}`);
    console.log(`💚 Health check: https://100.69.142.77:${PORT}/health`);
    console.log('');
    console.log('Esperando mensajes del dashboard...');
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Puerto ${PORT} ocupado. Ejecuta: fuser -k ${PORT}/tcp`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

startServer();
