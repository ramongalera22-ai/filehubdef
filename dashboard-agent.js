const https = require('https');
const { exec } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');

// Generate self-signed cert if not exists
if (!fs.existsSync('/home/carlos/.dashboard-cert.pem')) {
  try {
    execSync('openssl req -x509 -newkey rsa:2048 -keyout /home/carlos/.dashboard-key.pem -out /home/carlos/.dashboard-cert.pem -days 365 -nodes -subj "/CN=nucbox"', {stdio:'ignore'});
  } catch(e) { console.error('openssl error:', e.message); process.exit(1); }
}

const options = {
  key: fs.readFileSync('/home/carlos/.dashboard-key.pem'),
  cert: fs.readFileSync('/home/carlos/.dashboard-cert.pem')
};

const server = https.createServer(options, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { message } = JSON.parse(body);
      const cmd = `openclaw agent --channel telegram --to 596831448 --session-id dashboard-chat -m ${JSON.stringify(message)}`;
      exec(cmd, { timeout: 60000 }, (err, stdout) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: stdout.trim() || 'Sin respuesta' }));
      });
    } catch(e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(3001, '0.0.0.0', () => console.log('Dashboard HTTPS agent running on :3001'));
