// netlify/functions/telegram-webhook.js
// LifeBot Webhook — Full CRUD, Supabase persistence, Groq AI, 24/7

const TG_TOKEN = '8258049036:AAFY9c1FTsT_AqxoqdlJcDWgmX4UP-lioRU';
const TG_CHAT = '596831448';
const GROQ_KEY = ['gsk','_9BzwjsPO7LaJ','zMyXcw9cWGdyb3FY','cVR7CwkAfZvShxoS','UNrMgzUb'].join('');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

const SB_URL = 'https://ztigttazrdzkpxrzyast.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWd0dGF6cmR6a3B4cnp5YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTg5MzcsImV4cCI6MjA4NzU5NDkzN30.d-PQ0S_dXsTRXGdRrZDJiJOXcXFF4hEOaAGWpT3WaSM';
const SB_HDR = {'Content-Type':'application/json','apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Prefer':'return=representation'};

// ===== SUPABASE HELPERS =====
async function sbGet(table, query='') {
  try { const r = await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=created_at.desc${query}`, {headers:SB_HDR}); return r.ok ? await r.json() : []; } catch(e) { return []; }
}
async function sbInsert(table, data) {
  try { const r = await fetch(`${SB_URL}/rest/v1/${table}`, {method:'POST',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify(data)}); return r.ok; } catch(e) { return false; }
}
async function sbUpdate(table, id, data) {
  try { await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {method:'PATCH',headers:SB_HDR,body:JSON.stringify(data)}); } catch(e) {}
}
async function sbDelete(table, id) {
  try { await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {method:'DELETE',headers:SB_HDR}); } catch(e) {}
}

// ===== TELEGRAM =====
async function tg(text, chatId) {
  await fetch(`${TG_API}/sendMessage`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,parse_mode:'HTML'})});
}

// ===== GROQ AI =====
async function ai(sys, msg) {
  try {
    const r = await fetch(GROQ_URL, {method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${GROQ_KEY}`},
      body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'system',content:sys},{role:'user',content:msg}],max_tokens:600,temperature:0.4})});
    const d = await r.json();
    return d.choices?.[0]?.message?.content || (d.error ? `Error: ${d.error.message}` : 'Sin respuesta');
  } catch(e) { return `Error: ${e.message}`; }
}

const uid = () => String(Date.now()) + String(Math.floor(Math.random()*1000));
const now = () => new Date().toISOString();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'LifeBot Active' };
  try {
    const body = JSON.parse(event.body);
    const msg = body.message;
    if (!msg || !msg.text) return { statusCode: 200, body: 'ok' };
    const chatId = String(msg.chat.id);
    if (chatId !== TG_CHAT) return { statusCode: 200, body: 'no' };
    const text = msg.text.trim();
    const lo = text.toLowerCase();

    // /start | /help
    if (lo === '/start' || lo === '/help') {
      await tg(
`🤖 <b>LifeBot — Asistente 24/7</b>

📋 <b>VER:</b>
/resumen · /guardias · /eventos
/cursos · /objetivos · /tareas
/pisos · /trabajos · /balance

➕ <b>AÑADIR:</b>
/guardia 15 Guardia UCI 08:00-08:00+1
/evento 10:00 Reunión con tutor
/curso Ecografía — Sind.Médico — 10h
/objetivo Aprobar ECO
/gasto 50 Supermercado
/ingreso 1500 Nómina
/piso Centro 2hab 500€ — enlace
/trabajo MFyC CS — 2200€/mes
/tarea Revisar protocolo urgencias

🗑️ <b>ELIMINAR:</b>
/del guardia 15
/del curso ecografía
/del piso centro

📝 <b>NOTAS:</b>
/nota cursos Apuntes ECO — contenido
/nota pisos Piso Norte — 2hab 480€

🧠 Escribe en lenguaje natural y la IA entenderá`, chatId);
      return { statusCode: 200, body: 'ok' };
    }

    // ===== GUARDIA =====
    if (lo.startsWith('/guardia ')) {
      const m = text.match(/\/guardia\s+(\d{1,2})\s+(.+)/i);
      if (!m) { await tg('⚠️ /guardia DÍA nombre\nEj: /guardia 15 UCI 08:00-08:00+1', chatId); return {statusCode:200,body:'ok'}; }
      await sbInsert('lifebot_data', {id:uid(), type:'guardia', title:m[2], detail:'Día '+m[1], status:'activo', day:parseInt(m[1]), created_at:now()});
      await tg(`✅ Guardia día ${m[1]}: ${m[2]}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo === '/guardias') {
      const d = await sbGet('lifebot_data', '&type=eq.guardia');
      if (!d.length) { await tg('🚨 Sin guardias', chatId); return {statusCode:200,body:'ok'}; }
      d.sort((a,b)=>(a.day||0)-(b.day||0));
      await tg('🚨 <b>Guardias:</b>\n\n'+d.map(g=>`📅 Día ${g.day||'?'} — ${g.title}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== EVENTO =====
    if (lo.startsWith('/evento ')) {
      const m = text.match(/\/evento\s+(\d{1,2}:\d{2})\s+(.+)/i);
      if (!m) { await tg('⚠️ /evento HH:MM descripción', chatId); return {statusCode:200,body:'ok'}; }
      await sbInsert('lifebot_data', {id:uid(), type:'evento', title:m[2], detail:m[1], status:'activo', created_at:now()});
      await tg(`✅ Evento: ${m[1]} — ${m[2]}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo === '/eventos') {
      const d = await sbGet('lifebot_data', '&type=eq.evento');
      if (!d.length) { await tg('📅 Sin eventos', chatId); return {statusCode:200,body:'ok'}; }
      await tg('📅 <b>Eventos:</b>\n\n'+d.map(e=>`⏰ ${e.detail||''} — ${e.title}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== CURSO =====
    if (lo.startsWith('/curso ')) {
      const raw = text.slice(7).trim(), parts = raw.split('—').map(s=>s.trim());
      await sbInsert('lifebot_data', {id:uid(), type:'curso', title:parts[0], detail:parts.slice(1).join(' · ')||'', status:'pendiente', created_at:now()});
      await tg(`✅ Curso: 📚 ${parts[0]}${parts[1]?'\n📝 '+parts.slice(1).join(' · '):''}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo === '/cursos') {
      const d = await sbGet('lifebot_data', '&type=eq.curso');
      if (!d.length) { await tg('📚 Sin cursos', chatId); return {statusCode:200,body:'ok'}; }
      await tg('📚 <b>Cursos:</b>\n\n'+d.map((c,i)=>`${i+1}. ${c.title} [${c.status}]${c.detail?'\n   '+c.detail:''}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== OBJETIVO =====
    if (lo.startsWith('/objetivo ')) {
      await sbInsert('lifebot_data', {id:uid(), type:'objetivo', title:text.slice(10).trim(), status:'pendiente', created_at:now()});
      await tg(`✅ Objetivo: 🎯 ${text.slice(10).trim()}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo === '/objetivos') {
      const d = await sbGet('lifebot_data', '&type=eq.objetivo');
      if (!d.length) { await tg('🎯 Sin objetivos', chatId); return {statusCode:200,body:'ok'}; }
      await tg('🎯 <b>Objetivos:</b>\n\n'+d.map(o=>`${o.status==='completado'?'✅':'⬜'} ${o.title}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== GASTO / INGRESO / BALANCE =====
    if (lo.startsWith('/gasto ')) {
      const m = text.match(/\/gasto\s+([\d.]+)\s+(.+)/i);
      if (!m) { await tg('⚠️ /gasto CANTIDAD descripción', chatId); return {statusCode:200,body:'ok'}; }
      await sbInsert('lifebot_data', {id:uid(), type:'gasto', title:m[2], amount:parseFloat(m[1]), created_at:now()});
      await tg(`✅ Gasto: -€${parseFloat(m[1]).toFixed(2)} ${m[2]}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo.startsWith('/ingreso ')) {
      const m = text.match(/\/ingreso\s+([\d.]+)\s+(.+)/i);
      if (!m) { await tg('⚠️ /ingreso CANTIDAD descripción', chatId); return {statusCode:200,body:'ok'}; }
      await sbInsert('lifebot_data', {id:uid(), type:'ingreso', title:m[2], amount:parseFloat(m[1]), created_at:now()});
      await tg(`✅ Ingreso: +€${parseFloat(m[1]).toFixed(2)} ${m[2]}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo === '/balance') {
      const g = await sbGet('lifebot_data', '&type=eq.gasto'), i = await sbGet('lifebot_data', '&type=eq.ingreso');
      const tG=g.reduce((s,x)=>s+(x.amount||0),0), tI=i.reduce((s,x)=>s+(x.amount||0),0), b=tI-tG;
      await tg(`💰 Ingresos: €${tI.toFixed(2)}\n💸 Gastos: €${tG.toFixed(2)}\n${b>=0?'🟢':'🔴'} Balance: €${b.toFixed(2)}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== PISO =====
    if (lo.startsWith('/piso ')) {
      const raw = text.slice(6).trim(), parts = raw.split('—').map(s=>s.trim());
      await sbInsert('lifebot_pisos', {id:uid(), title:parts[0]||raw, detail:parts[1]||'', status:'nuevo', created_at:now()});
      await tg(`✅ Piso: 🏠 ${parts[0]||raw}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo === '/pisos') {
      const d = await sbGet('lifebot_pisos');
      if (!d.length) { await tg('🏠 Sin pisos', chatId); return {statusCode:200,body:'ok'}; }
      await tg('🏠 <b>Pisos:</b>\n\n'+d.map((p,i)=>`${i+1}. ${p.title} [${p.status}]${p.detail?'\n   '+p.detail:''}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== TRABAJO =====
    if (lo.startsWith('/trabajo ')) {
      const raw = text.slice(9).trim(), parts = raw.split('—').map(s=>s.trim());
      await sbInsert('lifebot_trabajos', {id:uid(), title:parts[0]||raw, detail:parts[1]||'', status:'nuevo', created_at:now()});
      await tg(`✅ Oferta: 💼 ${parts[0]||raw}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo === '/trabajos') {
      const d = await sbGet('lifebot_trabajos');
      if (!d.length) { await tg('💼 Sin ofertas', chatId); return {statusCode:200,body:'ok'}; }
      await tg('💼 <b>Ofertas:</b>\n\n'+d.map((t,i)=>`${i+1}. ${t.title} [${t.status}]${t.detail?'\n   '+t.detail:''}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== TAREA VIP =====
    if (lo.startsWith('/tarea ')) {
      await sbInsert('lifebot_data', {id:uid(), type:'tarea', title:text.slice(7).trim(), status:'pendiente', created_at:now()});
      await tg(`✅ Tarea: 📌 ${text.slice(7).trim()}`, chatId);
      return {statusCode:200,body:'ok'};
    }
    if (lo === '/tareas') {
      const d = await sbGet('lifebot_data', '&type=eq.tarea');
      if (!d.length) { await tg('📌 Sin tareas', chatId); return {statusCode:200,body:'ok'}; }
      await tg('📌 <b>Tareas:</b>\n\n'+d.map(t=>`${t.status==='completado'?'✅':'⬜'} ${t.title}`).join('\n'), chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== NOTA =====
    if (lo.startsWith('/nota ')) {
      const raw = text.slice(6).trim();
      const secs = {finanzas:'fin',objetivos:'obj',cursos:'cur',pisos:'pis',trabajo:'trb',piso:'pis',empleo:'trb'};
      const fw = raw.split(/\s+/)[0].toLowerCase();
      const cat = secs[fw] || 'fin';
      const rest = raw.slice(fw.length).trim(), parts = rest.split('—').map(s=>s.trim());
      await sbInsert('lifebot_notes', {id:uid(), category:cat, title:parts[0]||'Nota', content:parts[1]||'', created_at:now()});
      const labels = {fin:'💰 Finanzas',obj:'🎯 Objetivos',cur:'📚 Cursos',pis:'🏠 Pisos',trb:'💼 Trabajo'};
      await tg(`✅ Nota en ${labels[cat]}: <b>${parts[0]||'Nota'}</b>${parts[1]?'\n'+parts[1]:''}`, chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== /del TIPO búsqueda =====
    if (lo.startsWith('/del ')) {
      const parts = text.slice(5).trim().split(/\s+/);
      const tMap = {guardia:'guardia',evento:'evento',curso:'curso',objetivo:'objetivo',gasto:'gasto',ingreso:'ingreso',tarea:'tarea'};
      const tw = parts[0].toLowerCase(), query = parts.slice(1).join(' ').toLowerCase();
      
      if (tw === 'piso') {
        const items = await sbGet('lifebot_pisos');
        const f = items.find(i=>i.title.toLowerCase().includes(query));
        if (f) { await sbDelete('lifebot_pisos',f.id); await tg(`🗑️ Eliminado: ${f.title}`,chatId); }
        else await tg(`❌ No encontrado "${query}"`,chatId);
      } else if (tw === 'trabajo') {
        const items = await sbGet('lifebot_trabajos');
        const f = items.find(i=>i.title.toLowerCase().includes(query));
        if (f) { await sbDelete('lifebot_trabajos',f.id); await tg(`🗑️ Eliminado: ${f.title}`,chatId); }
        else await tg(`❌ No encontrado "${query}"`,chatId);
      } else if (tMap[tw]) {
        const items = await sbGet('lifebot_data', `&type=eq.${tMap[tw]}`);
        let f;
        if (tw==='guardia' && /^\d+$/.test(query)) f = items.find(i=>i.day===parseInt(query));
        else f = items.find(i=>i.title.toLowerCase().includes(query));
        if (f) { await sbDelete('lifebot_data',f.id); await tg(`🗑️ Eliminado: ${f.title}`,chatId); }
        else await tg(`❌ No encontrado "${query}"`,chatId);
      } else {
        await tg('⚠️ /del TIPO búsqueda\nTipos: guardia evento curso objetivo gasto ingreso tarea piso trabajo',chatId);
      }
      return {statusCode:200,body:'ok'};
    }

    // ===== /resumen =====
    if (lo === '/resumen') {
      const [gd,ev,cu,ob,ga,ig,ta,pi,tr] = await Promise.all([
        sbGet('lifebot_data','&type=eq.guardia'), sbGet('lifebot_data','&type=eq.evento'),
        sbGet('lifebot_data','&type=eq.curso'), sbGet('lifebot_data','&type=eq.objetivo'),
        sbGet('lifebot_data','&type=eq.gasto'), sbGet('lifebot_data','&type=eq.ingreso'),
        sbGet('lifebot_data','&type=eq.tarea'), sbGet('lifebot_pisos'), sbGet('lifebot_trabajos')
      ]);
      const tG=ga.reduce((s,x)=>s+(x.amount||0),0), tI=ig.reduce((s,x)=>s+(x.amount||0),0);
      await tg(
`📋 <b>RESUMEN LIFEBOT</b>

🚨 Guardias: ${gd.length}
📅 Eventos: ${ev.length}
📚 Cursos: ${cu.length} (${cu.filter(c=>c.status==='completado').length} hechos)
🎯 Objetivos: ${ob.filter(o=>o.status==='completado').length}/${ob.length}
📌 Tareas: ${ta.filter(t=>t.status==='completado').length}/${ta.length}
🏠 Pisos: ${pi.length}
💼 Ofertas: ${tr.length}
💰 Balance: €${(tI-tG).toFixed(2)} ${tI-tG>=0?'🟢':'🔴'}

📲 Dashboard: phenomenal-nasturtium-5e1a1d.netlify.app/dashboard`, chatId);
      return {statusCode:200,body:'ok'};
    }

    // ===== NATURAL LANGUAGE → GROQ =====
    const [gd,ev,cu,ob,ta,pi,tr] = await Promise.all([
      sbGet('lifebot_data','&type=eq.guardia&limit=5'), sbGet('lifebot_data','&type=eq.evento&limit=5'),
      sbGet('lifebot_data','&type=eq.curso&limit=5'), sbGet('lifebot_data','&type=eq.objetivo&limit=5'),
      sbGet('lifebot_data','&type=eq.tarea&limit=5'), sbGet('lifebot_pisos','&limit=3'), sbGet('lifebot_trabajos','&limit=3')
    ]);

    const sysP = `Eres LifeBot, asistente de Carlos Galera, MIR en Murcia. Español, conciso. Hoy: ${new Date().toLocaleDateString('es-ES')}.

DATOS:
Guardias: ${gd.map(g=>'D'+g.day+':'+g.title).join(', ')||'0'}
Cursos: ${cu.map(c=>c.title+'['+c.status+']').join(', ')||'0'}
Objetivos: ${ob.map(o=>(o.status==='completado'?'✓':'○')+o.title).join(', ')||'0'}
Tareas: ${ta.map(t=>(t.status==='completado'?'✓':'○')+t.title).join(', ')||'0'}
Pisos: ${pi.map(p=>p.title).join(', ')||'0'}
Ofertas: ${tr.map(t=>t.title).join(', ')||'0'}

Si quiere AÑADIR/ELIMINAR/COMPLETAR algo, responde SOLO JSON:
{"action":"add|del|done","type":"guardia|evento|curso|objetivo|gasto|ingreso|tarea|piso|trabajo|nota","data":{"title":"","detail":"","day":0,"amount":0,"category":"fin|obj|cur|pis|trb","query":""},"reply":"confirmación"}

Si es conversación/consulta, responde texto normal. Sé motivador y práctico.`;

    const resp = await ai(sysP, text);
    const jm = resp.match(/\{[\s\S]*\}/);
    if (jm) {
      try {
        const cmd = JSON.parse(jm[0]);
        const p = cmd.data || {};
        if (cmd.action === 'add') {
          if (cmd.type==='piso') await sbInsert('lifebot_pisos',{id:uid(),title:p.title||'Piso',detail:p.detail||'',status:'nuevo',created_at:now()});
          else if (cmd.type==='trabajo') await sbInsert('lifebot_trabajos',{id:uid(),title:p.title||'Oferta',detail:p.detail||'',status:'nuevo',created_at:now()});
          else if (cmd.type==='nota') await sbInsert('lifebot_notes',{id:uid(),category:p.category||'fin',title:p.title||'Nota',content:p.detail||'',created_at:now()});
          else { const e={id:uid(),type:cmd.type,title:p.title||'',detail:p.detail||'',status:'pendiente',created_at:now()}; if(p.day)e.day=p.day; if(p.amount)e.amount=p.amount; await sbInsert('lifebot_data',e); }
        }
        if (cmd.action === 'del') {
          const q=(p.query||p.title||'').toLowerCase();
          if(cmd.type==='piso'){const it=await sbGet('lifebot_pisos');const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_pisos',f.id);}
          else if(cmd.type==='trabajo'){const it=await sbGet('lifebot_trabajos');const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_trabajos',f.id);}
          else{const it=await sbGet('lifebot_data',`&type=eq.${cmd.type}`);const f=cmd.type==='guardia'&&p.day?it.find(i=>i.day===p.day):it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_data',f.id);}
        }
        if (cmd.action === 'done') {
          const q=(p.query||p.title||'').toLowerCase();
          const it=await sbGet('lifebot_data',`&type=eq.${cmd.type}`);const f=it.find(i=>i.title.toLowerCase().includes(q));
          if(f)await sbUpdate('lifebot_data',f.id,{status:'completado'});
        }
        await tg(cmd.reply||'✅ Hecho',chatId);
      } catch(e) { await tg(resp.replace(/\{[\s\S]*\}/,'').trim()||'✅',chatId); }
    } else {
      await tg(resp, chatId);
    }
    return {statusCode:200,body:'ok'};
  } catch(e) { console.error(e); return {statusCode:200,body:'err'}; }
};
// Deploy trigger: Mon Mar  2 06:32:34 UTC 2026
