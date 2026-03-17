// API endpoint para chat bidireccional
// Sincroniza mensajes entre Dashboard ↔ WhatsApp

const fs = require('fs');
const path = require('path');

const CHAT_FILE = path.join(__dirname, '..', 'chat-history.json');
const MAX_MESSAGES = 1000;

// Leer mensajes
function readMessages() {
  try {
    if (fs.existsSync(CHAT_FILE)) {
      return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error leyendo chat:', e);
  }
  return { conversation: [], metadata: { total_messages: 0 } };
}

// Guardar mensajes
function saveMessages(data) {
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error guardando chat:', e);
  }
}

// Handler principal
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Obtener mensajes
    const data = readMessages();
    const since = req.query.since ? parseInt(req.query.since) : 0;
    
    // Filtrar mensajes nuevos
    if (since > 0) {
      data.conversation = data.conversation.filter(m => 
        new Date(m.timestamp).getTime() > since
      );
    }

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // Enviar mensaje
    const { message, from = 'user', platform = 'web' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    const data = readMessages();
    
    const newMessage = {
      id: 'msg_' + Date.now(),
      timestamp: new Date().toISOString(),
      from: from,
      name: from === 'user' ? 'Carlos Galera' : 'Arditi',
      avatar: from === 'user' ? '👨‍⚕️' : '🤖',
      message: message,
      platform: platform,
      type: 'text'
    };

    data.conversation.push(newMessage);
    data.metadata.total_messages = data.conversation.length;
    data.metadata.last_update = new Date().toISOString();

    // Limitar historial
    if (data.conversation.length > MAX_MESSAGES) {
      data.conversation = data.conversation.slice(-MAX_MESSAGES);
    }

    saveMessages(data);

    // TODO: Sincronizar con WhatsApp si viene del dashboard
    if (platform === 'web' && from === 'user') {
      // Aquí iría la lógica para enviar a WhatsApp
      console.log('🔄 Mensaje dashboard → WhatsApp:', message);
    }

    return res.status(200).json({ 
      success: true, 
      message: newMessage 
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
};
