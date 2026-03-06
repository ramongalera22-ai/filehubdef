const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Configuración
const DATA_FILE = path.join(__dirname, 'whatsapp-messages.json');
const SYNC_INTERVAL = 5000; // 5 segundos
const NETLIFY_WEBHOOK = 'https://phenomenal-nasturtium-5e1a1d.netlify.app/.netlify/functions/whatsapp-bridge';

// Cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Almacenamiento local de mensajes
let messageStore = [];

// Cargar mensajes previos
function loadMessages() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      messageStore = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log(`📁 Cargados ${messageStore.length} mensajes previos`);
    }
  } catch (e) {
    console.error('❌ Error cargando mensajes:', e.message);
  }
}

// Guardar mensajes
function saveMessages() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(messageStore, null, 2));
  } catch (e) {
    console.error('❌ Error guardando mensajes:', e.message);
  }
}

// Eventos del cliente
client.on('qr', (qr) => {
  console.log('📱 Escanea este QR con WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp Relay conectado!');
  console.log('📱 Número:', client.info.wid.user);
  
  // Iniciar sync periódico
  setInterval(syncToDashboard, SYNC_INTERVAL);
});

client.on('message_create', async (msg) => {
  // Solo mensajes entrantes (no los que enviamos nosotros)
  if (msg.fromMe) return;
  
  const messageData = {
    id: msg.id.id,
    from: msg.from,
    fromMe: msg.fromMe,
    body: msg.body,
    timestamp: msg.timestamp * 1000,
    type: msg.type,
    hasMedia: msg.hasMedia,
    deviceType: msg.deviceType,
    isForwarded: msg.isForwarded,
    source: 'whatsapp'
  };
  
  // Evitar duplicados
  if (!messageStore.find(m => m.id === messageData.id)) {
    messageStore.push(messageData);
    saveMessages();
    
    console.log(`💬 [${new Date().toLocaleTimeString()}] ${msg.from}: ${msg.body.substring(0, 50)}`);
    
    // Enviar a dashboard vía webhook
    await sendToDashboard(messageData);
  }
});

// Enviar mensaje a dashboard
async function sendToDashboard(message) {
  try {
    const response = await fetch(NETLIFY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'receive',
        message: message,
        timestamp: Date.now()
      })
    });
    
    if (response.ok) {
      console.log('✅ Mensaje sincronizado con dashboard');
    }
  } catch (e) {
    console.error('❌ Error enviando a dashboard:', e.message);
  }
}

// Sync periódico con dashboard (recibir mensajes desde dashboard)
async function syncToDashboard() {
  try {
    const response = await fetch(`${NETLIFY_WEBHOOK}?action=poll&since=${Date.now() - SYNC_INTERVAL}`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        for (const msg of data.messages) {
          // Enviar mensaje desde dashboard a WhatsApp
          if (msg.target && msg.body) {
            await sendWhatsAppMessage(msg.target, msg.body);
          }
        }
      }
    }
  } catch (e) {
    // Silencioso - el dashboard puede no estar disponible
  }
}

// Enviar mensaje de WhatsApp
async function sendWhatsAppMessage(to, body) {
  try {
    const chat = await client.getChatById(to);
    await chat.sendMessage(body);
    console.log(`📤 Enviado a ${to}: ${body.substring(0, 50)}`);
    return true;
  } catch (e) {
    console.error('❌ Error enviando mensaje:', e.message);
    return false;
  }
}

// API HTTP local para el dashboard
const http = require('http');
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/messages' && req.method === 'GET') {
    // Devolver mensajes para el dashboard
    const since = parseInt(new URL(req.url, `http://localhost`).searchParams.get('since')) || 0;
    const messages = messageStore.filter(m => m.timestamp > since);
    res.end(JSON.stringify({ messages, count: messages.length }));
  } else if (req.url === '/send' && req.method === 'POST') {
    // Recibir mensaje desde dashboard para enviar a WhatsApp
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const success = await sendWhatsAppMessage(data.to, data.body);
        res.end(JSON.stringify({ success }));
      } catch (e) {
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/status' && req.method === 'GET') {
    res.end(JSON.stringify({
      connected: client.info ? true : false,
      number: client.info ? client.info.wid.user : null,
      messages: messageStore.length,
      uptime: process.uptime()
    }));
  } else {
    res.end(JSON.stringify({ ok: true, service: 'whatsapp-relay' }));
  }
});

// Iniciar
console.log('🚀 Iniciando WhatsApp Relay...');
loadMessages();
client.initialize();

server.listen(3001, () => {
  console.log('📡 API Relay escuchando en http://localhost:3001');
  console.log('🔗 Endpoints:');
  console.log('   GET  /status    - Estado del relay');
  console.log('   GET  /messages  - Mensajes recibidos');
  console.log('   POST /send      - Enviar mensaje a WhatsApp');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando WhatsApp Relay...');
  await client.destroy();
  saveMessages();
  process.exit(0);
});
