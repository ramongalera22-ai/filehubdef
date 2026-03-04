#!/usr/bin/env node
// openclaw-server.js — HTTP simple (Cloudflare provee HTTPS externamente)

const http = require('http');
const { exec } = require('child_process');

const PORT = 3443;
const CHAT_ID = '596831448';

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 50000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bot: '@arddiitibot', model: 'kimi-k2.5' }));
    return;
  }

  if (req.url === '/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message, sessionId = 'dashboard-chat' } = JSON.parse(body);
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No message' }));
          return;
        }

        console.log(`📨 [${sessionId}] ${message}`);

        const safeMsg = message.replace(/'/g, "'\\''");
        const cmd = `openclaw agent --channel telegram --to ${CHAT_ID} --session-id ${sessionId} -m '${safeMsg}'`;
        
        const output = await runCommand(cmd);
        const reply = output.trim() || 'Mensaje enviado a OpenClaw';

        console.log(`✅ Respuesta: ${reply.substring(0, 100)}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (err) {
        console.error('❌ Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('\n🦞 OpenClaw Dashboard Bridge');
  console.log(`✅ Servidor HTTP en puerto ${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('\nEsperando mensajes del dashboard...\n');
});
