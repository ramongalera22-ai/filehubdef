// Netlify Function: WhatsApp Bridge
// Sincronización bidireccional WhatsApp ↔ Dashboard

let messageQueue = [];
const MAX_MESSAGES = 1000;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const action = event.queryStringParameters?.action || 'status';

  try {
    // GET /?action=poll - Dashboard pide mensajes pendientes
    if (event.httpMethod === 'GET' && action === 'poll') {
      const since = parseInt(event.queryStringParameters?.since) || 0;
      const messages = messageQueue.filter(m => m.timestamp > since);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ messages, count: messages.length })
      };
    }

    // GET /?action=status - Estado del bridge
    if (event.httpMethod === 'GET' && action === 'status') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'online',
          queueSize: messageQueue.length,
          timestamp: Date.now()
        })
      };
    }

    // POST / - Recibir mensaje desde relay o dashboard
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      
      // Mensaje desde relay (WhatsApp → Dashboard)
      if (data.action === 'receive' && data.message) {
        const msg = {
          ...data.message,
          synced: true,
          processedAt: Date.now()
        };
        
        // Agregar a cola (limitar tamaño)
        messageQueue.push(msg);
        if (messageQueue.length > MAX_MESSAGES) {
          messageQueue = messageQueue.slice(-MAX_MESSAGES);
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ received: true, id: msg.id })
        };
      }
      
      // Mensaje desde dashboard (Dashboard → WhatsApp)
      if (data.action === 'send' && data.target && data.body) {
        const msg = {
          id: `dash-${Date.now()}`,
          target: data.target,
          body: data.body,
          timestamp: Date.now(),
          source: 'dashboard',
          direction: 'outgoing'
        };
        
        messageQueue.push(msg);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ queued: true, id: msg.id })
        };
      }
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
