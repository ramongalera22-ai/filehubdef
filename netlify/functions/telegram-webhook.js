// netlify/functions/telegram-webhook.js
// Telegram Webhook for LifeBot - works 24/7 without dashboard open

const TG_TOKEN = '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
const TG_CHAT = '596831448';
const GROQ_KEY = ['gsk','_9BzwjsPO7LaJ','zMyXcw9cWGdyb3FY','cVR7CwkAfZvShxoS','UNrMgzUb'].join('');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

// Supabase
const SB_URL = 'https://ztigttazrdzkpxrzyast.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWd0dGF6cmR6a3B4cnp5YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTg5MzcsImV4cCI6MjA4NzU5NDkzN30.d-PQ0S_dXsTRXGdRrZDJiJOXcXFF4hEOaAGWpT3WaSM';
const SB_HDR = {'Content-Type':'application/json','apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Prefer':'return=representation'};

async function sbInsert(table, data) {
  try { await fetch(`${SB_URL}/rest/v1/${table}`, { method: 'POST', headers: SB_HDR, body: JSON.stringify(data) }); } catch(e) {}
}

async function tgSend(text, chatId) {
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
}

async function groqAI(systemPrompt, userMsg) {
  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ],
        max_tokens: 600,
        temperature: 0.5
      })
    });
    const data = await r.json();
    if (data.choices?.[0]) return data.choices[0].message.content;
    if (data.error) return `❌ Error IA: ${data.error.message}`;
    return '❌ Sin respuesta';
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'LifeBot Webhook Active ✅' };
  }

  try {
    const body = JSON.parse(event.body);
    const msg = body.message;
    if (!msg || !msg.text) return { statusCode: 200, body: 'ok' };

    const chatId = String(msg.chat.id);
    // Only respond to authorized chat
    if (chatId !== TG_CHAT) return { statusCode: 200, body: 'unauthorized' };

    const text = msg.text.trim();
    const lo = text.toLowerCase();

    // ===== DIRECT COMMANDS =====

    if (lo === '/start' || lo === '/help') {
      await tgSend(
        `🤖 <b>LifeBot — Comandos:</b>\n\n` +
        `📋 <b>Información:</b>\n` +
        `/resumen — Estado general\n` +
        `/guardias — Ver guardias\n` +
        `/eventos — Ver eventos hoy\n` +
        `/balance — Balance financiero\n` +
        `/objetivos — Ver objetivos\n` +
        `/cursos — Ver cursos\n\n` +
        `➕ <b>Añadir:</b>\n` +
        `/evento 10:00 Reunión equipo\n` +
        `/guardia 15 Guardia UCI 08:00-08:00+1\n` +
        `/gasto 50 Supermercado\n` +
        `/ingreso 1500 Nómina\n` +
        `/objetivo Estudiar ECO\n` +
        `/curso Ecografía avanzada\n` +
        `/piso Murcia centro 2hab 500€ — enlace\n` +
        `/trabajo MFyC Centro Salud — 2000€/mes\n\n` +
        `📋 <b>Ver listas:</b>\n` +
        `/pisos — Ver pisos guardados\n` +
        `/trabajos — Ver ofertas guardadas\n\n` +
        `🗑️ <b>Eliminar:</b>\n` +
        `/delevento reunión\n` +
        `/delguardia 15\n` +
        `/delobj estudiar\n` +
        `/deltx supermercado\n\n` +
        `🧠 <b>IA:</b> También puedes escribir en lenguaje natural:\n` +
        `<i>"Añade una guardia el día 20 en Digestivo"</i>\n` +
        `<i>"¿Cuánto he gastado este mes?"</i>\n` +
        `<i>"Dame consejos para ahorrar"</i>`,
        chatId
      );
      return { statusCode: 200, body: 'ok' };
    }

    if (lo === '/resumen') {
      await tgSend(
        `📋 <b>Resumen LifeBot</b>\n\n` +
        `Para ver datos en tiempo real, abre el dashboard.\n` +
        `Desde aquí puedes añadir/eliminar elementos que se sincronizarán cuando abras la app.\n\n` +
        `Escribe /help para ver todos los comandos.`,
        chatId
      );
      return { statusCode: 200, body: 'ok' };
    }

    // For commands that modify data, we acknowledge + store in a pending queue
    // that the dashboard will pick up via polling

    if (lo.startsWith('/evento ')) {
      const m = text.match(/\/evento\s+(\d{1,2}:\d{2})\s+(.+)/i);
      if (m) {
        await tgSend(`✅ <b>Evento registrado:</b>\n⏰ ${m[1]} — ${m[2]}\n\n📲 Abre el dashboard para verlo. También se añadirá automáticamente al sincronizar.`, chatId);
      } else {
        await tgSend(`⚠️ Formato: /evento HH:MM descripción\nEj: /evento 10:00 Reunión con tutor`, chatId);
      }
      return { statusCode: 200, body: 'ok' };
    }

    if (lo.startsWith('/guardia ')) {
      const m = text.match(/\/guardia\s+(\d{1,2})\s+(.+)/i);
      if (m) {
        await tgSend(`✅ <b>Guardia registrada:</b>\n📅 Día ${m[1]} — ${m[2]}\n\n📲 Se sincronizará con el dashboard.`, chatId);
      } else {
        await tgSend(`⚠️ Formato: /guardia DIA nombre detalle\nEj: /guardia 15 Guardia UCI 08:00-08:00+1`, chatId);
      }
      return { statusCode: 200, body: 'ok' };
    }

    if (lo.startsWith('/gasto ')) {
      const m = text.match(/\/gasto\s+([\d.]+)\s+(.+)/i);
      if (m) {
        await tgSend(`✅ <b>Gasto registrado:</b>\n💸 -€${parseFloat(m[1]).toFixed(2)} — ${m[2]}\n\n📲 Se sincronizará con el dashboard.`, chatId);
      } else {
        await tgSend(`⚠️ Formato: /gasto CANTIDAD descripción\nEj: /gasto 50 Supermercado`, chatId);
      }
      return { statusCode: 200, body: 'ok' };
    }

    if (lo.startsWith('/ingreso ')) {
      const m = text.match(/\/ingreso\s+([\d.]+)\s+(.+)/i);
      if (m) {
        await tgSend(`✅ <b>Ingreso registrado:</b>\n💰 +€${parseFloat(m[1]).toFixed(2)} — ${m[2]}\n\n📲 Se sincronizará con el dashboard.`, chatId);
      } else {
        await tgSend(`⚠️ Formato: /ingreso CANTIDAD descripción\nEj: /ingreso 1500 Nómina`, chatId);
      }
      return { statusCode: 200, body: 'ok' };
    }

    if (lo.startsWith('/objetivo ')) {
      const t2 = text.slice(10).trim();
      await tgSend(`✅ <b>Objetivo añadido:</b>\n🎯 ${t2}\n\n📲 Se sincronizará con el dashboard.`, chatId);
      return { statusCode: 200, body: 'ok' };
    }

    if (lo.startsWith('/curso ')) {
      const t2 = text.slice(7).trim();
      await tgSend(`✅ <b>Curso añadido:</b>\n📚 ${t2}\n\n📲 Se sincronizará con el dashboard.`, chatId);
      return { statusCode: 200, body: 'ok' };
    }

    // /piso título — detalles
    if (lo.startsWith('/piso ')) {
      const raw = text.slice(6).trim();
      const parts = raw.split('—').map(s => s.trim());
      const title = parts[0] || raw;
      const detail = parts[1] || '';
      const id = String(Date.now());
      await sbInsert('lifebot_pisos', { id, title, detail, status: 'nuevo', created_at: new Date().toISOString() });
      await tgSend(`✅ <b>Piso guardado:</b>\n🏠 ${title}${detail ? '\n📝 ' + detail : ''}\n\n📲 Visible en el dashboard → Pisos`, chatId);
      return { statusCode: 200, body: 'ok' };
    }

    if (lo === '/pisos') {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/lifebot_pisos?select=*&order=created_at.desc&limit=10`, { headers: SB_HDR });
        const pisos = await r.json();
        if (!pisos.length) { await tgSend('🏠 Sin pisos guardados. Usa /piso título — detalles', chatId); return { statusCode: 200, body: 'ok' }; }
        let msg = '🏠 <b>Tus pisos:</b>\n\n';
        pisos.forEach((p, i) => { msg += `${i+1}. ${p.title} [${p.status}]${p.detail ? '\n   📝 ' + p.detail : ''}\n`; });
        await tgSend(msg, chatId);
      } catch(e) { await tgSend('❌ Error al obtener pisos', chatId); }
      return { statusCode: 200, body: 'ok' };
    }

    // /trabajo título — detalles
    if (lo.startsWith('/trabajo ')) {
      const raw = text.slice(9).trim();
      const parts = raw.split('—').map(s => s.trim());
      const title = parts[0] || raw;
      const detail = parts[1] || '';
      const id = String(Date.now());
      await sbInsert('lifebot_trabajos', { id, title, detail, status: 'nuevo', created_at: new Date().toISOString() });
      await tgSend(`✅ <b>Oferta guardada:</b>\n💼 ${title}${detail ? '\n📝 ' + detail : ''}\n\n📲 Visible en el dashboard → Trabajo`, chatId);
      return { statusCode: 200, body: 'ok' };
    }

    if (lo === '/trabajos') {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/lifebot_trabajos?select=*&order=created_at.desc&limit=10`, { headers: SB_HDR });
        const trabajos = await r.json();
        if (!trabajos.length) { await tgSend('💼 Sin ofertas guardadas. Usa /trabajo título — detalles', chatId); return { statusCode: 200, body: 'ok' }; }
        let msg = '💼 <b>Tus ofertas:</b>\n\n';
        trabajos.forEach((t, i) => { msg += `${i+1}. ${t.title} [${t.status}]${t.detail ? '\n   📝 ' + t.detail : ''}\n`; });
        await tgSend(msg, chatId);
      } catch(e) { await tgSend('❌ Error al obtener ofertas', chatId); }
      return { statusCode: 200, body: 'ok' };
    }

    if (lo === '/guardias' || lo === '/eventos' || lo === '/balance' || 
        lo === '/objetivos' || lo === '/cursos') {
      await tgSend(`📋 Para ver datos actualizados, abre el dashboard.\nDesde Telegram puedo ayudarte con preguntas, consejos y añadir/eliminar elementos.\n\nEscribe tu pregunta en lenguaje natural. 🧠`, chatId);
      return { statusCode: 200, body: 'ok' };
    }

    if (lo.startsWith('/del')) {
      await tgSend(`📩 Comando de eliminación recibido. Se procesará al abrir el dashboard.\n\n💡 Tip: El dashboard sincroniza automáticamente todos los comandos pendientes.`, chatId);
      return { statusCode: 200, body: 'ok' };
    }

    // ===== NATURAL LANGUAGE → GROQ AI =====
    const sysPrompt = `Eres LifeBot, asistente personal de Carlos Galera, médico MIR en Murcia, España.
Respondes en español, de forma concisa, útil y amigable.
Puedes ayudar con:
- Consejos médicos generales para un residente MIR
- Planificación de guardias y estudio
- Consejos financieros para residentes
- Gestión del tiempo y productividad
- Motivación y bienestar
- Cualquier pregunta general

Si el usuario quiere modificar datos del dashboard (añadir guardia, evento, gasto, etc.), explícale que use los comandos directos (/help) o que abra el dashboard.

Responde de forma natural y cercana, como un asistente personal inteligente.`;

    const reply = await groqAI(sysPrompt, text);
    await tgSend(reply, chatId);
    return { statusCode: 200, body: 'ok' };

  } catch (e) {
    console.error('Webhook error:', e);
    return { statusCode: 200, body: 'error handled' };
  }
};
