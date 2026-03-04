// netlify/functions/openclaw-bridge.js
// Puente entre el dashboard (Netlify HTTPS) y OpenClaw en NucBox (Tailscale)
// NucBox IP Tailscale: 100.69.142.77 puerto 3443

const NUCBOX_URL = process.env.NUCBOX_URL || 'https://metals-somewhere-potatoes-solving.trycloudflare.com';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7853838527:AAHtI2svAQgGzwx8jVUvGxSPiOe_mRJxWFo';
const TG_CHAT = '596831448';

async function sendToTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' })
    });
  } catch (e) { /* silently fail */ }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { message, sessionId = 'dashboard-chat', context = '' } = JSON.parse(event.body || '{}');
    if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No message' }) };

    const fullMessage = context ? `[CONTEXTO: ${context}]\n\n${message}` : message;

    // Call NucBox OpenClaw server
    const res = await fetch(`${NUCBOX_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: fullMessage, sessionId }),
      // Tailscale uses self-signed cert - in Node 18+ we need to handle this
      signal: AbortSignal.timeout(55000)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`NucBox error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const reply = data.reply || data.response || 'Sin respuesta';

    // También enviar a Telegram en paralelo
    await sendToTelegram(`💬 <b>Dashboard:</b> ${message}\n\n🤖 <b>OpenClaw:</b> ${reply}`);

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };

  } catch (err) {
    // If NucBox is offline, fallback message
    const isOffline = err.message.includes('fetch') || err.message.includes('ECONNREFUSED') || err.message.includes('timeout');
    return {
      statusCode: isOffline ? 503 : 500,
      headers,
      body: JSON.stringify({
        error: isOffline
          ? 'NucBox offline. Asegúrate de que el NucBox esté encendido y el servidor OpenClaw corriendo.'
          : err.message,
        offline: isOffline
      })
    };
  }
};
