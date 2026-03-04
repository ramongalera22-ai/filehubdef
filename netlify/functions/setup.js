const fetch = require('node-fetch');

exports.handler = async () => {
  const TG = process.env.TELEGRAM_BOT_TOKEN;
  const WEBHOOK = process.env.WEBHOOK_URL || 'https://phenomenal-nasturtium-5e1a1d.netlify.app/api/telegram-webhook';
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG}/setWebhook?url=${WEBHOOK}`);
    const data = await res.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
