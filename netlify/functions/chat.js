// netlify/functions/chat.js
// Proxy seguro hacia Anthropic API — subagente dashboard independiente

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || '';
const OR_KEY = process.env.OR_KEY || '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';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `Eres Arditi, el asistente personal de Carlos Galera, médico MIR en España.
Eres inteligente, directo y útil. Conoces su situación:
- Médico residente (MIR), guardias frecuentes, horario irregular
- Busca piso en alquiler en Barcelona (presupuesto ~800-1000€/mes)
- Busca trabajo médico post-residencia
- Liquidity actual: ~1578€
- Pagos pendientes: 557€
- 51 guardias registradas

Puedes ayudarle con:
- Organizar su semana y guardias
- Analizar finanzas y gastos
- Buscar y comparar pisos y ofertas de trabajo
- Consejos médicos y de carrera
- Cualquier consulta personal

Responde siempre en español, de forma concisa y con emojis cuando sea apropiado.
Cuando menciones pisos o trabajos, estructura la info claramente.`;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body || '{}');
    if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No message' }) };

    // Build messages array with history
    const messages = [
      ...history.slice(-10), // last 10 turns
      { role: 'user', content: message }
    ];

    // Use OpenRouter (kimi-k2.5) or Anthropic if key available
    let reply;
    if (ANTHROPIC_KEY) {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      reply = data.content?.[0]?.text || 'Sin respuesta';
    } else {
      const res = await fetch(OR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OR_KEY}`,
          'HTTP-Referer': 'https://phenomenal-nasturtium-5e1a1d.netlify.app',
          'X-Title': 'FILEHUB Dashboard'
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2.5',
          max_tokens: 1024,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      reply = data.choices?.[0]?.message?.content || 'Sin respuesta';
    }
    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
