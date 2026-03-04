const fetch = require('node-fetch');
const TG_TOKEN = process.env.ARDITI_BOT_TOKEN;
const OR_KEY = process.env.OPENROUTER_KEY;
const TG_CHAT = '596831448';
const MODEL = 'moonshotai/kimi-k2.5';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const msg = body.message;
    if (!msg || !msg.text) return { statusCode: 200, body: 'ok' };
    const chatId = String(msg.chat?.id);
    if (chatId !== TG_CHAT) return { statusCode: 200, body: 'ok' };

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OR_KEY}` },
      body: JSON.stringify({ model: MODEL, max_tokens: 1000, messages: [{ role: 'user', content: msg.text }] })
    });
    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || 'Sin respuesta';

    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: reply })
    });
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
