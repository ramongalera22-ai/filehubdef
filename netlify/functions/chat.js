// netlify/functions/chat.js
// Proxy seguro hacia Anthropic API — subagente dashboard independiente

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || '';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

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

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const reply = data.content?.[0]?.text || 'Sin respuesta';

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
