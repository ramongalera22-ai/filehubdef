const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = '596831448';
const OR_KEY = process.env.OPENROUTER_KEY;
const MODEL = 'moonshotai/kimi-k2.5';

const SYSTEM_PROMPT = `Eres Arditi, el asistente personal de Carlos Galera, médico MIR en Barcelona.
Tienes acceso a su información personal:
- Liquidez actual: ~1578€
- Guardias este mes: 51
- Pagos pendientes: 557€
- Buscando piso en Barcelona (800-1000€/mes)
- Especialidad: Medicina Interna

Ayúdale con: guardias, finanzas, pisos, trabajo post-MIR, medicina.
Responde en español, de forma concisa y útil.`;

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
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'No message' });

    const messages = [
      ...history.slice(-10),
      { role: 'user', content: message }
    ];

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OR_KEY}`,
        'HTTP-Referer': 'https://filehubdef.vercel.app',
        'X-Title': 'FILEHUB Dashboard'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ]
      })
    });

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || 'Sin respuesta';

    await sendToTelegram(`💬 <b>Dashboard:</b> ${message}\n\n🤖 <b>Arditi:</b> ${reply}`);

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
