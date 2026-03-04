// netlify/functions/telegram-proxy.js
// Proxy seguro para Telegram - no expone el token en el frontend

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7853838527:AAHtI2svAQgGzwx8jVUvGxSPiOe_mRJxWFo";
const CHAT_ID = "596831448";
const TG_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const action = event.queryStringParameters?.action || "getUpdates";

  try {
    if (action === "getUpdates") {
      const offset = event.queryStringParameters?.offset || "";
      const url = `${TG_BASE}/getUpdates?limit=50${offset ? `&offset=${offset}` : ""}&allowed_updates=["message"]`;
      const res = await fetch(url);
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (action === "sendMessage" && event.httpMethod === "POST") {
      const { text } = JSON.parse(event.body || "{}");
      if (!text) return { statusCode: 400, headers, body: JSON.stringify({ error: "No text" }) };

      const res = await fetch(`${TG_BASE}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" })
      });
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
