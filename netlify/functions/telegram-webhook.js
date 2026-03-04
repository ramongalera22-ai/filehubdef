exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' } };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'POST only' };
  }

  const TOKEN = '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
  
  try {
    const update = JSON.parse(event.body);
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';
      
      let reply = '❓ Usa /help';
      
      if (text === '/start' || text === '/help') {
        reply = '✅ Webhook OK!\n/help - Ayuda\n/pisos - Pisos\n/ofertas - Ofertas';
      } else if (text === '/pisos') {
        reply = '🏠 https://phenomenal-nasturtium-5e1a1d.netlify.app/pisos.html';
      } else if (text === '/ofertas') {
        reply = '💼 https://phenomenal-nasturtium-5e1a1d.netlify.app/ofertas.html';
      }
      
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: reply })
      });
    }
    
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ error: e.message }) };
  }
};