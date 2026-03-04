// ============================================
// 📋 LifeBot Daily Briefing — Cron Job
// Ejecutar cada día a las 07:00 con:
//   crontab: 0 7 * * * cd /home/carlos/.openclaw/workspace && node daily-briefing.js
// ============================================

const MATON_KEY = 'iLBE6Iwn1WRtas_R7Mq6cx3k1fcGl8bAF4yFJbCl42Br9n-MvCfiP1yUt5pKs6xetIWMqAUDIzBiljSytTtB8qvvQDA4MfMJ4ZM5tGWyfw';
const TG_TOKEN = '7853838527:AAHtI2svAQgGzwx8jVUvGxSPiOe_mRJxWFo';
const TG_CHAT = '882491371';
const SB_URL = 'https://igvadjgjpyuvzailjqwg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndmFkamdqcHl1dnphaWxqcXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDI3MTAsImV4cCI6MjA4ODAxODcxMH0.eAqKCHDzrkvMTseaBP0I_JICP1owX60-cp3agYqRz4Q';
const SB_HDR = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };
const GMAIL_FROM = 'ramongalera22@gmail.com';

// ─── Helpers ─────────────────────────────────────────────
async function tg(text) {
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' })
  });
}

async function sbGet(table) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=created_at.desc`, { headers: SB_HDR });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

async function sbDelete(table, id) {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE', headers: { ...SB_HDR, 'Prefer': 'return=representation' } });
}

async function getCalendar(days) {
  const now = new Date(), future = new Date(now.getTime() + days * 86400000);
  const q = `?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(future.toISOString())}&singleEvents=true&orderBy=startTime`;
  const hdr = { 'Authorization': `Bearer ${MATON_KEY}`, 'Content-Type': 'application/json' };
  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://gateway.maton.ai/google-calendar/calendar/v3/calendars/primary/events${q}`, { headers: hdr }).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`https://gateway.maton.ai/google-calendar/calendar/v3/calendars/${encodeURIComponent('ramongalera22@gmail.com')}/events${q}`, { headers: hdr }).then(r => r.json()).catch(() => ({ items: [] }))
    ]);
    const all = [...(r1.items || []), ...(r2.items || [])];
    all.sort((a, b) => new Date(a.start?.dateTime || a.start?.date || 0) - new Date(b.start?.dateTime || b.start?.date || 0));
    const seen = new Set();
    return all.filter(e => { const k = (e.summary || '') + (e.start?.dateTime || e.start?.date || ''); if (seen.has(k)) return false; seen.add(k); return true; });
  } catch { return []; }
}

async function getGmailUnread() {
  try {
    const r = await fetch('https://gateway.maton.ai/gmail/gmail/v1/users/me/messages?q=is:unread&maxResults=5', {
      headers: { 'Authorization': `Bearer ${MATON_KEY}`, 'Content-Type': 'application/json' }
    });
    const d = await r.json();
    return d.resultSizeEstimate || 0;
  } catch { return 0; }
}

async function sendEmail(subject, htmlBody) {
  const recipients = [GMAIL_FROM, 'carlosgalera2roman@gmail.com'];
  for (const to of recipients) {
    try {
      const raw = [
        `From: LifeBot <${GMAIL_FROM}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        htmlBody
      ].join('\r\n');
      const encoded = Buffer.from(raw).toString('base64url');
      await fetch('https://gateway.maton.ai/gmail/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${MATON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded })
      });
      console.log(`📧 Email enviado a ${to}`);
    } catch (e) { console.error(`Email error (${to}):`, e.message); }
  }
}

// ─── Formatters ──────────────────────────────────────────
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const dayName = () => new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const isGuardia = (ev) => (ev.summary || '').toLowerCase().match(/guardia|suap|ume|hsl/);
const greeting = () => { const h = new Date().getHours(); return h < 13 ? '☀️ Buenos días' : h < 20 ? '🌤️ Buenas tardes' : '🌙 Buenas noches'; };

// ─── Auto-clean past guardias ────────────────────────────
async function cleanPastGuardias() {
  const data = await sbGet('lifebot_data');
  const guardias = data.filter(d => d.type === 'guardia');
  const today = new Date().getDate();
  const month = new Date().getMonth();
  let cleaned = 0;
  for (const g of guardias) {
    const cm = new Date(g.created_at).getMonth();
    if (cm < month || (g.day && g.day < today)) {
      await sbDelete('lifebot_data', g.id);
      cleaned++;
    }
  }
  return cleaned;
}

// ─── MAIN ────────────────────────────────────────────────
async function main() {
  console.log('🌅 Generando briefing diario...');

  // 1. Limpiar guardias pasadas
  const cleaned = await cleanPastGuardias();

  // 2. Obtener datos
  const [calToday, calWeek, data, pisos, trabajos, unread] = await Promise.all([
    getCalendar(1),
    getCalendar(7),
    sbGet('lifebot_data'),
    sbGet('lifebot_pisos'),
    sbGet('lifebot_trabajos'),
    getGmailUnread()
  ]);

  const guardias = data.filter(d => d.type === 'guardia');
  const tareas = data.filter(d => d.type === 'tarea' && d.status !== 'completado');
  const objetivos = data.filter(d => d.type === 'objetivo' && d.status !== 'completado');
  const cursos = data.filter(d => d.type === 'curso' && d.status === 'activo');
  const gastos = data.filter(d => d.type === 'gasto');
  const ingresos = data.filter(d => d.type === 'ingreso');
  const balance = ingresos.reduce((s, i) => s + (i.amount || 0), 0) - gastos.reduce((s, g) => s + (g.amount || 0), 0);
  const pisosNew = pisos.filter(p => p.status === 'nuevo');
  const trabajosNew = trabajos.filter(t => t.status === 'nuevo');

  // Calendar events for today
  const todayGuardias = calToday.filter(isGuardia);
  const todayEvents = calToday.filter(e => !isGuardia(e));

  // Calendar guardias this week
  const weekGuardias = calWeek.filter(isGuardia);

  // Tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomStr = tomorrow.toISOString().split('T')[0];
  const calTomorrow = calWeek.filter(e => (e.start?.dateTime || e.start?.date || '').startsWith(tomStr));

  // ─── Build Telegram message ────────────────────────────
  let msg = `${greeting()}, Carlos\n`;
  msg += `📅 <b>${dayName()}</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // TODAY'S AGENDA
  msg += `📋 <b>AGENDA DE HOY</b>\n`;
  if (todayGuardias.length) {
    msg += `🚨 <b>¡GUARDIA HOY!</b>\n`;
    todayGuardias.forEach(e => {
      const t = e.start?.dateTime ? fmtTime(e.start.dateTime) : 'Todo el día';
      msg += `   ${t} — ${e.summary}\n`;
    });
    msg += `\n`;
  }
  if (todayEvents.length) {
    todayEvents.forEach(e => {
      const t = e.start?.dateTime ? fmtTime(e.start.dateTime) : '📌';
      msg += `   ${t} — ${e.summary}\n`;
    });
  }
  if (!calToday.length) msg += `   Sin eventos — ¡día libre! 🎉\n`;
  msg += `\n`;

  // TOMORROW
  if (calTomorrow.length) {
    msg += `🔮 <b>MAÑANA</b>\n`;
    calTomorrow.forEach(e => {
      const t = e.start?.dateTime ? fmtTime(e.start.dateTime) : '📌';
      const g = isGuardia(e) ? '🚨 ' : '';
      msg += `   ${t} — ${g}${e.summary}\n`;
    });
    msg += `\n`;
  }

  // GUARDIAS THIS WEEK
  if (weekGuardias.length) {
    msg += `🚨 <b>GUARDIAS ESTA SEMANA</b> (${weekGuardias.length})\n`;
    weekGuardias.forEach(e => {
      const d = fmtDate(e.start?.dateTime || e.start?.date || '');
      const t = e.start?.dateTime ? fmtTime(e.start.dateTime) : '';
      msg += `   📅 ${d} ${t} — ${e.summary}\n`;
    });
    msg += `\n`;
  }

  // TASKS
  if (tareas.length) {
    msg += `📌 <b>TAREAS PENDIENTES</b> (${tareas.length})\n`;
    tareas.slice(0, 5).forEach(t => msg += `   ⬜ ${t.title}\n`);
    if (tareas.length > 5) msg += `   ... y ${tareas.length - 5} más\n`;
    msg += `\n`;
  }

  // OBJECTIVES
  if (objetivos.length) {
    msg += `🎯 <b>OBJETIVOS</b> (${objetivos.length} pendientes)\n`;
    objetivos.slice(0, 3).forEach(o => msg += `   → ${o.title}\n`);
    msg += `\n`;
  }

  // FINANCE
  msg += `💰 <b>FINANZAS</b>\n`;
  msg += `   Balance: ${balance >= 0 ? '🟢' : '🔴'} €${balance.toFixed(2)}\n`;
  if (gastos.length) msg += `   Últimos gastos: ${gastos.slice(0, 3).map(g => `${g.title} (€${(g.amount || 0).toFixed(0)})`).join(', ')}\n`;
  msg += `\n`;

  // PISOS
  if (pisosNew.length) {
    msg += `🏠 <b>PISOS NUEVOS</b> (${pisosNew.length})\n`;
    pisosNew.slice(0, 3).forEach(p => msg += `   → ${p.title}\n`);
    if (pisosNew.length > 3) msg += `   ... y ${pisosNew.length - 3} más\n`;
    msg += `\n`;
  }

  // TRABAJOS
  if (trabajosNew.length) {
    msg += `💼 <b>OFERTAS NUEVAS</b> (${trabajosNew.length})\n`;
    trabajosNew.slice(0, 3).forEach(t => msg += `   → ${t.title}\n`);
    if (trabajosNew.length > 3) msg += `   ... y ${trabajosNew.length - 3} más\n`;
    msg += `\n`;
  }

  // COURSES
  if (cursos.length) {
    msg += `📚 <b>CURSOS ACTIVOS</b> (${cursos.length})\n`;
    cursos.forEach(c => msg += `   📖 ${c.title}\n`);
    msg += `\n`;
  }

  // GMAIL
  if (unread > 0) {
    msg += `📧 <b>CORREO</b>: ${unread} emails sin leer\n\n`;
  }

  // STATS
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 <b>RESUMEN</b>\n`;
  msg += `   📅 ${calToday.length} eventos hoy | ${calWeek.length} esta semana\n`;
  msg += `   🚨 ${weekGuardias.length} guardias | 📌 ${tareas.length} tareas\n`;
  msg += `   🏠 ${pisos.length} pisos (${pisosNew.length} nuevos)\n`;
  msg += `   💼 ${trabajos.length} ofertas (${trabajosNew.length} nuevas)\n`;
  if (cleaned) msg += `   🗑️ ${cleaned} guardias pasadas limpiadas\n`;
  msg += `\n`;
  msg += `🔗 <a href="https://phenomenal-nasturtium-5e1a1d.netlify.app">Abrir Dashboard</a>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 LifeBot · ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`;

  // ─── Send Telegram ─────────────────────────────────────
  console.log('📱 Enviando a Telegram...');
  await tg(msg);

  // ─── Send Email ────────────────────────────────────────
  const emailSubject = `📋 Briefing diario — ${dayName()}`;
  const emailHtml = `
<div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#818cf8;margin:0;font-size:24px;">🧠 LifeBot Briefing</h1>
    <p style="color:#94a3b8;font-size:14px;margin-top:4px;">${dayName()}</p>
  </div>
  
  ${todayGuardias.length ? `<div style="background:#7f1d1d;border-radius:12px;padding:16px;margin-bottom:16px;">
    <h3 style="color:#fca5a5;margin:0 0 8px;">🚨 ¡GUARDIA HOY!</h3>
    ${todayGuardias.map(e => `<p style="color:#fecaca;margin:4px 0;">${e.start?.dateTime ? fmtTime(e.start.dateTime) : 'Todo el día'} — ${e.summary}</p>`).join('')}
  </div>` : ''}

  <div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:16px;">
    <h3 style="color:#818cf8;margin:0 0 12px;">📋 Agenda de hoy</h3>
    ${calToday.length ? calToday.map(e => {
      const t = e.start?.dateTime ? fmtTime(e.start.dateTime) : '📌';
      const g = isGuardia(e);
      return `<p style="margin:6px 0;color:${g ? '#fca5a5' : '#e2e8f0'};">${t} — ${g ? '🚨 ' : ''}${e.summary}</p>`;
    }).join('') : '<p style="color:#94a3b8;">Sin eventos — ¡día libre! 🎉</p>'}
  </div>

  ${weekGuardias.length ? `<div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:16px;">
    <h3 style="color:#fca5a5;margin:0 0 12px;">🚨 Guardias esta semana (${weekGuardias.length})</h3>
    ${weekGuardias.map(e => `<p style="margin:4px 0;color:#fecaca;">${fmtDate(e.start?.dateTime || e.start?.date || '')} — ${e.summary}</p>`).join('')}
  </div>` : ''}

  ${tareas.length ? `<div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:16px;">
    <h3 style="color:#818cf8;margin:0 0 12px;">📌 Tareas pendientes (${tareas.length})</h3>
    ${tareas.slice(0, 5).map(t => `<p style="margin:4px 0;">⬜ ${t.title}</p>`).join('')}
  </div>` : ''}

  <div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:16px;">
    <h3 style="color:#818cf8;margin:0 0 12px;">💰 Finanzas</h3>
    <p style="font-size:24px;font-weight:bold;color:${balance >= 0 ? '#34d399' : '#f87171'};margin:0;">€${balance.toFixed(2)}</p>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:16px;">
    <div style="flex:1;background:#1e293b;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:24px;">🏠</div>
      <div style="font-size:20px;font-weight:bold;color:#fbbf24;">${pisos.length}</div>
      <div style="font-size:12px;color:#94a3b8;">Pisos (${pisosNew.length} nuevos)</div>
    </div>
    <div style="flex:1;background:#1e293b;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:24px;">💼</div>
      <div style="font-size:20px;font-weight:bold;color:#34d399;">${trabajos.length}</div>
      <div style="font-size:12px;color:#94a3b8;">Ofertas (${trabajosNew.length} nuevas)</div>
    </div>
  </div>

  <div style="text-align:center;margin-top:24px;">
    <a href="https://phenomenal-nasturtium-5e1a1d.netlify.app" style="background:#818cf8;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Abrir Dashboard</a>
  </div>

  <p style="text-align:center;color:#64748b;font-size:11px;margin-top:24px;">🤖 LifeBot · ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>
</div>`;

  console.log('📧 Enviando email...');
  await sendEmail(emailSubject, emailHtml);

  console.log('✅ Briefing completado');
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1); });
