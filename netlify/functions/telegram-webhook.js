// Netlify Function: Telegram Webhook Handler
// URL: https://phenomenal-nasturtium-5e1a1d.netlify.app/.netlify/functions/telegram-webhook

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const DASHBOARDS = {
  pisos: 'https://phenomenal-nasturtium-5e1a1d.netlify.app/pisos.html',
  ofertas: 'https://phenomenal-nasturtium-5e1a1d.netlify.app/ofertas.html',
  index: 'https://phenomenal-nasturtium-5e1a1d.netlify.app/index-dashboard.html'
};

const COMMANDS = {
  '/start': '🤖 ¡Hola! Soy Arditi, tu asistente médico.\n\n📋 Comandos disponibles:\n/pisos - Ver pisos Barcelona\n/ofertas - Ver ofertas médico\n/empleo - Buscar empleo\n/resumen - Resumen diario\n/cursos - Ver cursos\n/status - Estado sistema\n/help - Ver ayuda',
  
  '/help': '🤖 **Comandos disponibles:**\n\n🏠 **Dashboards:**\n/pisos - Pisos en Barcelona\n/ofertas - Ofertas médico familia\n/empleo - Ofertas de trabajo\n\n📊 **Información:**\n/resumen - Resumen diario completo\n/cursos - Cursos disponibles\n/status - Estado del sistema\n/help - Ver ayuda',
  
  '/pisos': `🏠 **Dashboard Pisos Barcelona**\n\n${DASHBOARDS.pisos}\n\n✅ Actualiza: 07:00, 10:00, 15:00, 23:00\n📊 Pisos <1.400€ en Barcelona`,
  
  '/ofertas': `💼 **Dashboard Ofertas Médico**\n\n${DASHBOARDS.ofertas}\n\n✅ Actualiza: 07:00, 10:00, 15:00, 23:00\n👨‍⚕️ Médico familia Barcelona`,
  
  '/empleo': `💼 **Búsqueda de empleo:**\n\n🔍 Portales activos:\n• CAMFIC\n• Gencat SAS\n• CatSalut\n• InfoJobs\n• Hospital Clínic\n• Teknon\n\n${DASHBOARDS.ofertas}`,
  
  '/resumen': `📊 **Resumen Diario:**\n\n🏠 Pisos: ${DASHBOARDS.pisos}\n💼 Ofertas: ${DASHBOARDS.ofertas}\n\n⏰ Próximas actualizaciones:\n• 15:00 - Pisos + Ofertas\n• 23:00 - Pisos + Ofertas\n\n✅ Todo actualizado automáticamente`,
  
  '/cursos': `📚 **Cursos Disponibles:**\n\nPróximos cursos médicos:\n• ECO presencial (Marzo)\n• Paliativos online\n• Sesiones APP médica\n\nConsulta tu calendario para fechas exactas.`,
  
  '/status': `✅ **Estado del Sistema:**\n\n🤖 Bot: @Arditi2bot\n🆔 Webhook: Activo\n📊 Dashboard: Conectado\n\n🔄 Automatizaciones:\n• Pisos: 4x/día ✅\n• Ofertas: 4x/día ✅\n• CAMFIC: Diario ✅\n\n🟢 Todo operativo`
};

async function sendMessage(chatId, text) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

exports.handler = async (event, context) => {
  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const update = JSON.parse(event.body);
    
    if (update.message && update.message.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;
      const command = text.split(' ')[0].toLowerCase();
      
      console.log(`Command received: ${command} from ${chatId}`);

      if (COMMANDS[command]) {
        await sendMessage(chatId, COMMANDS[command]);
      } else {
        await sendMessage(chatId, `🤖 No entiendo "${text}"\n\nEscribe /help para ver comandos disponibles.`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};