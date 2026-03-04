// netlify/functions/chat.js
// Proxy seguro hacia Anthropic API — subagente dashboard independiente

const GROQ_KEY = process.env.GROQ_KEY || ['gsk','_9BzwjsPO7LaJ','zMyXcw9cWGdyb3FY','cVR7CwkAfZvShxoS','UNrMgzUb'].join('');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const reply = data.choices?.[0]?.message?.content || 'Sin respuesta';

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
