const NUCBOX_URL = process.env.NUCBOX_URL || 'https://skip-cooked-rebel-graduation.trycloudflare.com';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = '596831448';

async function sendToTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' })
    });
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, sessionId = 'dashboard-chat', context = '' } = req.body;
    if (!message) return res.status(400).json({ error: 'No message' });

    const fullMessage = context ? `[CONTEXTO: ${context}]\n\n${message}` : message;

    const response = await fetch(`${NUCBOX_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: fullMessage, sessionId }),
      signal: AbortSignal.timeout(55000)
    });

    if (!response.ok) throw new Error(`NucBox error ${response.status}`);

    const data = await response.json();
    const reply = data.reply || data.response || 'Sin respuesta';

    await sendToTelegram(`💬 <b>Dashboard:</b> ${message}\n\n🤖 <b>OpenClaw:</b> ${reply}`);

    return res.status(200).json({ reply });

  } catch (err) {
    const offline = err.message.includes('fetch') || err.message.includes('ECONNREFUSED') || err.message.includes('timeout');
    return res.status(offline ? 503 : 500).json({
      error: offline ? 'NucBox offline. Asegúrate de que el servidor esté corriendo.' : err.message,
      offline
    });
  }
}
