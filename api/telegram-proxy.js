const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = '596831448';
const TG_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || 'getUpdates';

  try {
    if (action === 'getUpdates') {
      const offset = req.query.offset || '';
      const url = `${TG_BASE}/getUpdates?limit=50${offset ? `&offset=${offset}` : ''}&allowed_updates=["message"]`;
      const r = await fetch(url);
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'sendMessage' && req.method === 'POST') {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'No text' });
      const r = await fetch(`${TG_BASE}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
