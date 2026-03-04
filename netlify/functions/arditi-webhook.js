// netlify/functions/arditi-webhook.js
// Arditi2bot — mismo sistema que OpenClaw2

const TG_TOKEN = '8654591414:AAHEQcN1OynUnVMgNnJH6QgDlyjitora4WY';
const TG_CHAT = '596831448';
const OR_KEY = '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';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

const SB_URL = 'https://igvadjgjpyuvzailjqwg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndmFkamdqcHl1dnphaWxqcXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDI3MTAsImV4cCI6MjA4ODAxODcxMH0.eAqKCHDzrkvMTseaBP0I_JICP1owX60-cp3agYqRz4Q';
const SB_HDR = {'Content-Type':'application/json','apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Prefer':'return=representation'};

const uid = () => String(Date.now()) + String(Math.floor(Math.random()*1000));
const now = () => new Date().toISOString();

async function sbGet(t,q=''){try{const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*&order=created_at.desc${q}`,{headers:SB_HDR});return r.ok?await r.json():[];}catch(e){return[];}}
async function sbInsert(t,d){try{await fetch(`${SB_URL}/rest/v1/${t}`,{method:'POST',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify(d)});}catch(e){}}
async function sbUpdate(t,id,d){try{await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify(d)});}catch(e){}}
async function sbDelete(t,id){try{await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'DELETE',headers:SB_HDR});}catch(e){}}

async function tg(text, chatId) {
  await fetch(`${TG_API}/sendMessage`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:chatId||TG_CHAT, text, parse_mode:'HTML'})
  });
}

async function ai(sys, msg) {
  try {
    const r = await fetch(OR_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${OR_KEY}`,'HTTP-Referer':'https://phenomenal-nasturtium-5e1a1d.netlify.app','X-Title':'Arditi2bot'},
      body: JSON.stringify({model:'anthropic/claude-haiku-4.5', messages:[{role:'system',content:sys},{role:'user',content:msg}], max_tokens:1000, temperature:0.7})
    });
    const d = await r.json();
    if(d.error) throw new Error(d.error.message);
    return d.choices?.[0]?.message?.content || 'Sin respuesta';
  } catch(e) { return 'Error IA: ' + e.message; }
}

function getSysPrompt() {
  return `Eres Arditi, asistente personal IA de Carlos (Ramón) Galera, médico MIR de Familia (R4) en Murcia, España. 
Eres inteligente, conciso, útil y usas emojis. Respondes siempre en español.
Tienes acceso a sus datos: guardias, eventos, cursos, objetivos, finanzas, pisos y trabajos.
Carlos busca piso en Barcelona/Murcia y trabajo post-MIR en MFyC.`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return {statusCode:200, body:'Arditi2bot OK'};

  let body;
  try { body = JSON.parse(event.body); } catch { return {statusCode:200,body:'ok'}; }

  const msg = body?.message;
  if (!msg?.text) return {statusCode:200,body:'ok'};

  const text = msg.text.trim();
  const lo = text.toLowerCase().split(' ')[0];
  const chatId = String(msg.chat.id);

  // Solo responde al chat autorizado
  if (chatId !== TG_CHAT) {
    await tg('⛔ No autorizado.', chatId);
    return {statusCode:200,body:'ok'};
  }

  try {
    // === COMANDOS ===
    if (lo === '/start' || lo === '/help') {
      await tg(`🤖 <b>Arditi — Asistente Personal</b>\n\n📋 <b>Consultas:</b>\n/resumen /guardias /eventos /cursos /objetivos /tareas /pisos /trabajos /balance\n\n➕ <b>Añadir:</b>\n/guardia 15 UCI\n/evento 10:00 Reunión\n/curso ECO — detalles\n/objetivo Aprobar MIR\n/gasto 50 Supermercado\n/ingreso 1500 Nómina\n/piso Centro 500€ — link\n/trabajo MFyC — 2200€\n/tarea Revisar protocolo\n\n🗑️ /del tipo búsqueda\n📝 /nota sección Título — texto\n🧠 O escríbeme en lenguaje natural`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/guardias') {
      const d = await sbGet('lifebot_data','&type=eq.guardia');
      const today = new Date().getDate();
      const future = d.filter(g => !g.day || g.day >= today);
      if (!future.length) { await tg('🚨 Sin guardias pendientes', chatId); return {statusCode:200,body:'ok'}; }
      future.sort((a,b)=>(a.day||0)-(b.day||0));
      await tg('🚨 <b>Guardias:</b>\n\n'+future.map(g=>`📅 Día ${g.day||'?'} — ${g.title}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/guardia ')) {
      const m = text.match(/\/guardia\s+(\d{1,2})\s+(.+)/i);
      if (!m) { await tg('⚠️ Uso: /guardia DÍA nombre\nEj: /guardia 15 UCI', chatId); return {statusCode:200,body:'ok'}; }
      await sbInsert('lifebot_data',{id:uid(),type:'guardia',title:m[2],detail:'Día '+m[1],status:'activo',day:parseInt(m[1]),created_at:now()});
      await tg(`✅ Guardia añadida: Día ${m[1]} — ${m[2]}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/eventos') {
      const d = await sbGet('lifebot_data','&type=eq.evento');
      if (!d.length) { await tg('📅 Sin eventos', chatId); return {statusCode:200,body:'ok'}; }
      await tg('📅 <b>Eventos:</b>\n\n'+d.map(e=>`⏰ ${e.detail||''} — ${e.title}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/evento ')) {
      const m = text.match(/\/evento\s+(\d{1,2}:\d{2})\s+(.+)/i);
      if (!m) { await tg('⚠️ Uso: /evento HH:MM descripción', chatId); return {statusCode:200,body:'ok'}; }
      await sbInsert('lifebot_data',{id:uid(),type:'evento',title:m[2],detail:m[1],status:'activo',created_at:now()});
      await tg(`✅ Evento: ${m[1]} — ${m[2]}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/cursos') {
      const d = await sbGet('lifebot_data','&type=eq.curso');
      if (!d.length) { await tg('📚 Sin cursos', chatId); return {statusCode:200,body:'ok'}; }
      await tg('📚 <b>Cursos:</b>\n\n'+d.map((c,i)=>`${i+1}. ${c.title} [${c.status}]${c.detail?'\n   '+c.detail:''}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/curso ')) {
      const r = text.slice(7).trim(), p = r.split('—').map(s=>s.trim());
      await sbInsert('lifebot_data',{id:uid(),type:'curso',title:p[0],detail:p.slice(1).join(' · ')||'',status:'pendiente',created_at:now()});
      await tg(`✅ Curso: 📚 ${p[0]}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/objetivos') {
      const d = await sbGet('lifebot_data','&type=eq.objetivo');
      if (!d.length) { await tg('🎯 Sin objetivos', chatId); return {statusCode:200,body:'ok'}; }
      await tg('🎯 <b>Objetivos:</b>\n\n'+d.map(o=>`${o.status==='completado'?'✅':'⬜'} ${o.title}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/objetivo ')) {
      await sbInsert('lifebot_data',{id:uid(),type:'objetivo',title:text.slice(10).trim(),status:'pendiente',created_at:now()});
      await tg(`✅ Objetivo: 🎯 ${text.slice(10).trim()}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/tareas') {
      const d = await sbGet('lifebot_data','&type=eq.tarea');
      if (!d.length) { await tg('📌 Sin tareas', chatId); return {statusCode:200,body:'ok'}; }
      await tg('📌 <b>Tareas:</b>\n\n'+d.map(t=>`${t.status==='completado'?'✅':'⬜'} ${t.title}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/tarea ')) {
      await sbInsert('lifebot_data',{id:uid(),type:'tarea',title:text.slice(7).trim(),status:'pendiente',created_at:now()});
      await tg(`✅ Tarea: 📌 ${text.slice(7).trim()}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/balance') {
      const g = await sbGet('lifebot_data','&type=eq.gasto');
      const i = await sbGet('lifebot_data','&type=eq.ingreso');
      const tG = g.reduce((s,x)=>s+(x.amount||0),0);
      const tI = i.reduce((s,x)=>s+(x.amount||0),0);
      await tg(`💰 <b>Balance:</b>\n\n+€${tI.toFixed(2)} ingresos\n-€${tG.toFixed(2)} gastos\n\n${tI-tG>=0?'🟢':'🔴'} <b>€${(tI-tG).toFixed(2)}</b>`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/gasto ')) {
      const m = text.match(/\/gasto\s+([\d.]+)\s+(.+)/i);
      if (!m) { await tg('⚠️ Uso: /gasto CANTIDAD descripción', chatId); return {statusCode:200,body:'ok'}; }
      await sbInsert('lifebot_data',{id:uid(),type:'gasto',title:m[2],amount:parseFloat(m[1]),created_at:now()});
      await tg(`✅ -€${parseFloat(m[1]).toFixed(2)} ${m[2]}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/ingreso ')) {
      const m = text.match(/\/ingreso\s+([\d.]+)\s+(.+)/i);
      if (!m) { await tg('⚠️ Uso: /ingreso CANTIDAD descripción', chatId); return {statusCode:200,body:'ok'}; }
      await sbInsert('lifebot_data',{id:uid(),type:'ingreso',title:m[2],amount:parseFloat(m[1]),created_at:now()});
      await tg(`✅ +€${parseFloat(m[1]).toFixed(2)} ${m[2]}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/pisos') {
      const d = await sbGet('lifebot_pisos');
      if (!d.length) { await tg('🏠 Sin pisos guardados', chatId); return {statusCode:200,body:'ok'}; }
      await tg('🏠 <b>Pisos:</b>\n\n'+d.map((p,i)=>`${i+1}. ${p.title} [${p.status}]${p.detail?'\n   '+p.detail:''}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/piso ')) {
      const r = text.slice(6).trim(), p = r.split('—').map(s=>s.trim());
      await sbInsert('lifebot_pisos',{id:uid(),title:p[0]||r,detail:p[1]||'',status:'nuevo',created_at:now()});
      await tg(`✅ 🏠 ${p[0]||r}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/trabajos') {
      const d = await sbGet('lifebot_trabajos');
      if (!d.length) { await tg('💼 Sin ofertas guardadas', chatId); return {statusCode:200,body:'ok'}; }
      await tg('💼 <b>Ofertas:</b>\n\n'+d.map((t,i)=>`${i+1}. ${t.title} [${t.status}]${t.detail?'\n   '+t.detail:''}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/trabajo ')) {
      const r = text.slice(9).trim(), p = r.split('—').map(s=>s.trim());
      await sbInsert('lifebot_trabajos',{id:uid(),title:p[0]||r,detail:p[1]||'',status:'nuevo',created_at:now()});
      await tg(`✅ 💼 ${p[0]||r}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo.startsWith('/del ')) {
      const pts = text.slice(5).trim().split(/\s+/);
      const tw = pts[0].toLowerCase(), q = pts.slice(1).join(' ').toLowerCase();
      const tmap = {guardia:'guardia',evento:'evento',curso:'curso',objetivo:'objetivo',gasto:'gasto',ingreso:'ingreso',tarea:'tarea'};
      if (tw === 'piso') {
        const it = await sbGet('lifebot_pisos');
        const f = it.find(i=>i.title.toLowerCase().includes(q));
        if (f) { await sbDelete('lifebot_pisos',f.id); await tg(`🗑️ ${f.title}`, chatId); }
        else await tg('❌ No encontrado', chatId);
      } else if (tw === 'trabajo') {
        const it = await sbGet('lifebot_trabajos');
        const f = it.find(i=>i.title.toLowerCase().includes(q));
        if (f) { await sbDelete('lifebot_trabajos',f.id); await tg(`🗑️ ${f.title}`, chatId); }
        else await tg('❌ No encontrado', chatId);
      } else if (tmap[tw]) {
        const it = await sbGet('lifebot_data',`&type=eq.${tmap[tw]}`);
        const f = it.find(i=>i.title.toLowerCase().includes(q));
        if (f) { await sbDelete('lifebot_data',f.id); await tg(`🗑️ ${f.title}`, chatId); }
        else await tg('❌ No encontrado', chatId);
      } else await tg('⚠️ /del TIPO búsqueda\nTipos: guardia evento curso objetivo gasto ingreso tarea piso trabajo', chatId);
      return {statusCode:200,body:'ok'};
    }

    if (lo === '/resumen') {
      const [gd,ev,cu,ob,ta,pi,tr,ga,ig] = await Promise.all([
        sbGet('lifebot_data','&type=eq.guardia'),
        sbGet('lifebot_data','&type=eq.evento'),
        sbGet('lifebot_data','&type=eq.curso'),
        sbGet('lifebot_data','&type=eq.objetivo'),
        sbGet('lifebot_data','&type=eq.tarea'),
        sbGet('lifebot_pisos'),
        sbGet('lifebot_trabajos'),
        sbGet('lifebot_data','&type=eq.gasto'),
        sbGet('lifebot_data','&type=eq.ingreso')
      ]);
      const tG = ga.reduce((s,x)=>s+(x.amount||0),0);
      const tI = ig.reduce((s,x)=>s+(x.amount||0),0);
      await tg(`📋 <b>RESUMEN ARDITI</b>\n\n🚨 Guardias: ${gd.length}\n📅 Eventos: ${ev.length}\n📚 Cursos: ${cu.length}\n🎯 Objetivos: ${ob.filter(o=>o.status==='completado').length}/${ob.length}\n📌 Tareas: ${ta.filter(t=>t.status==='completado').length}/${ta.length}\n🏠 Pisos: ${pi.length}\n💼 Ofertas: ${tr.length}\n${tI-tG>=0?'🟢':'🔴'} Balance: €${(tI-tG).toFixed(2)}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    // === CHAT IA (lenguaje natural) ===
    const [gd,ev,ta,pi] = await Promise.all([
      sbGet('lifebot_data','&type=eq.guardia'),
      sbGet('lifebot_data','&type=eq.evento'),
      sbGet('lifebot_data','&type=eq.tarea'),
      sbGet('lifebot_pisos')
    ]);
    const ctx = `Guardias: ${gd.map(g=>'Día '+g.day+' '+g.title).join(', ')||'ninguna'}. Eventos: ${ev.map(e=>e.detail+' '+e.title).join(', ')||'ninguno'}. Tareas pendientes: ${ta.filter(t=>t.status!=='completado').map(t=>t.title).join(', ')||'ninguna'}. Pisos: ${pi.length}.`;
    const sys = getSysPrompt() + '\n\nDATOS ACTUALES: ' + ctx;
    const resp = await ai(sys, text);
    await tg('🤖 ' + resp, chatId);

  } catch(e) {
    console.error('Arditi error:', e);
    await tg('❌ Error: ' + e.message, chatId);
  }

  return {statusCode:200,body:'ok'};
};
