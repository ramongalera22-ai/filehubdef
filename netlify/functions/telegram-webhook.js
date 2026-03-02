// netlify/functions/telegram-webhook.js
// LifeBot PROXY: handles LifeBot commands + forwards ALL to OpenClaw NucBox

const TG_TOKEN = '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
const TG_CHAT = '596831448';
const GROQ_KEY = ['gsk','_9BzwjsPO7LaJ','zMyXcw9cWGdyb3FY','cVR7CwkAfZvShxoS','UNrMgzUb'].join('');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
const NUCBOX_URL = 'http://100.69.142.77:3000/telegram-webhook';

const SB_URL = 'https://ztigttazrdzkpxrzyast.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWd0dGF6cmR6a3B4cnp5YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTg5MzcsImV4cCI6MjA4NzU5NDkzN30.d-PQ0S_dXsTRXGdRrZDJiJOXcXFF4hEOaAGWpT3WaSM';
const SB_HDR = {'Content-Type':'application/json','apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Prefer':'return=representation'};

async function sbGet(t,q=''){try{const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*&order=created_at.desc${q}`,{headers:SB_HDR});return r.ok?await r.json():[];}catch(e){return[];}}
async function sbInsert(t,d){try{await fetch(`${SB_URL}/rest/v1/${t}`,{method:'POST',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify(d)});}catch(e){}}
async function sbUpdate(t,id,d){try{await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify(d)});}catch(e){}}
async function sbDelete(t,id){try{await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'DELETE',headers:SB_HDR});}catch(e){}}
async function tg(text,chatId){await fetch(`${TG_API}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,parse_mode:'HTML'})});}
async function ai(sys,msg){try{const r=await fetch(GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${GROQ_KEY}`},body:JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'system',content:sys},{role:'user',content:msg}],max_tokens:600,temperature:0.4})});const d=await r.json();return d.choices?.[0]?.message?.content||'Sin respuesta';}catch(e){return'Error IA';}}
const uid=()=>String(Date.now())+String(Math.floor(Math.random()*1000));
const now=()=>new Date().toISOString();

// Forward to OpenClaw NucBox (fire & forget, never blocks)
function fwd(body){fetch(NUCBOX_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>{});}

// LifeBot command list
const LB_CMDS = ['/help','/start','/resumen','/balance','/guardias','/eventos','/cursos','/objetivos','/tareas','/pisos','/trabajos'];
const LB_PRE = ['/guardia ','/evento ','/curso ','/objetivo ','/gasto ','/ingreso ','/piso ','/trabajo ','/tarea ','/nota ','/del '];
function isLB(lo){return LB_CMDS.includes(lo)||LB_PRE.some(p=>lo.startsWith(p));}

async function handle(text,lo,cid){
  if(lo==='/start'||lo==='/help'){await tg(`🤖 <b>LifeBot 24/7</b>\n\n📋 /resumen /guardias /eventos /cursos /objetivos /tareas /pisos /trabajos /balance\n\n➕ /guardia 15 UCI\n/evento 10:00 Reunión\n/curso ECO — detalles\n/objetivo Aprobar\n/gasto 50 Super\n/ingreso 1500 Nómina\n/piso Centro 500€ — link\n/trabajo MFyC — 2200€\n/tarea Revisar protocolo\n\n🗑️ /del tipo búsqueda\n📝 /nota sección Título — texto\n🧠 Lenguaje natural → IA`,cid);return;}
  if(lo.startsWith('/guardia ')){const m=text.match(/\/guardia\s+(\d{1,2})\s+(.+)/i);if(!m){await tg('⚠️ /guardia DÍA nombre',cid);return;}await sbInsert('lifebot_data',{id:uid(),type:'guardia',title:m[2],detail:'Día '+m[1],status:'activo',day:parseInt(m[1]),created_at:now()});await tg(`✅ Guardia día ${m[1]}: ${m[2]}`,cid);return;}
  if(lo==='/guardias'){const d=await sbGet('lifebot_data','&type=eq.guardia');if(!d.length){await tg('🚨 Sin guardias',cid);return;}d.sort((a,b)=>(a.day||0)-(b.day||0));await tg('🚨 <b>Guardias:</b>\n\n'+d.map(g=>`📅 Día ${g.day||'?'} — ${g.title}`).join('\n'),cid);return;}
  if(lo.startsWith('/evento ')){const m=text.match(/\/evento\s+(\d{1,2}:\d{2})\s+(.+)/i);if(!m){await tg('⚠️ /evento HH:MM desc',cid);return;}await sbInsert('lifebot_data',{id:uid(),type:'evento',title:m[2],detail:m[1],status:'activo',created_at:now()});await tg(`✅ Evento: ${m[1]} — ${m[2]}`,cid);return;}
  if(lo==='/eventos'){const d=await sbGet('lifebot_data','&type=eq.evento');if(!d.length){await tg('📅 Sin eventos',cid);return;}await tg('📅 <b>Eventos:</b>\n\n'+d.map(e=>`⏰ ${e.detail||''} — ${e.title}`).join('\n'),cid);return;}
  if(lo.startsWith('/curso ')){const r=text.slice(7).trim(),p=r.split('—').map(s=>s.trim());await sbInsert('lifebot_data',{id:uid(),type:'curso',title:p[0],detail:p.slice(1).join(' · ')||'',status:'pendiente',created_at:now()});await tg(`✅ Curso: 📚 ${p[0]}`,cid);return;}
  if(lo==='/cursos'){const d=await sbGet('lifebot_data','&type=eq.curso');if(!d.length){await tg('📚 Sin cursos',cid);return;}await tg('📚 <b>Cursos:</b>\n\n'+d.map((c,i)=>`${i+1}. ${c.title} [${c.status}]${c.detail?'\n   '+c.detail:''}`).join('\n'),cid);return;}
  if(lo.startsWith('/objetivo ')){await sbInsert('lifebot_data',{id:uid(),type:'objetivo',title:text.slice(10).trim(),status:'pendiente',created_at:now()});await tg(`✅ Objetivo: 🎯 ${text.slice(10).trim()}`,cid);return;}
  if(lo==='/objetivos'){const d=await sbGet('lifebot_data','&type=eq.objetivo');if(!d.length){await tg('🎯 Sin objetivos',cid);return;}await tg('🎯 <b>Objetivos:</b>\n\n'+d.map(o=>`${o.status==='completado'?'✅':'⬜'} ${o.title}`).join('\n'),cid);return;}
  if(lo.startsWith('/gasto ')){const m=text.match(/\/gasto\s+([\d.]+)\s+(.+)/i);if(!m){await tg('⚠️ /gasto N desc',cid);return;}await sbInsert('lifebot_data',{id:uid(),type:'gasto',title:m[2],amount:parseFloat(m[1]),created_at:now()});await tg(`✅ -€${parseFloat(m[1]).toFixed(2)} ${m[2]}`,cid);return;}
  if(lo.startsWith('/ingreso ')){const m=text.match(/\/ingreso\s+([\d.]+)\s+(.+)/i);if(!m){await tg('⚠️ /ingreso N desc',cid);return;}await sbInsert('lifebot_data',{id:uid(),type:'ingreso',title:m[2],amount:parseFloat(m[1]),created_at:now()});await tg(`✅ +€${parseFloat(m[1]).toFixed(2)} ${m[2]}`,cid);return;}
  if(lo==='/balance'){const g=await sbGet('lifebot_data','&type=eq.gasto'),i=await sbGet('lifebot_data','&type=eq.ingreso');const tG=g.reduce((s,x)=>s+(x.amount||0),0),tI=i.reduce((s,x)=>s+(x.amount||0),0);await tg(`💰 +€${tI.toFixed(2)} 💸 -€${tG.toFixed(2)}\n${tI-tG>=0?'🟢':'🔴'} €${(tI-tG).toFixed(2)}`,cid);return;}
  if(lo.startsWith('/piso ')){const r=text.slice(6).trim(),p=r.split('—').map(s=>s.trim());await sbInsert('lifebot_pisos',{id:uid(),title:p[0]||r,detail:p[1]||'',status:'nuevo',created_at:now()});await tg(`✅ 🏠 ${p[0]||r}`,cid);return;}
  if(lo==='/pisos'){const d=await sbGet('lifebot_pisos');if(!d.length){await tg('🏠 Sin pisos',cid);return;}await tg('🏠 <b>Pisos:</b>\n\n'+d.map((p,i)=>`${i+1}. ${p.title} [${p.status}]${p.detail?'\n   '+p.detail:''}`).join('\n'),cid);return;}
  if(lo.startsWith('/trabajo ')){const r=text.slice(9).trim(),p=r.split('—').map(s=>s.trim());await sbInsert('lifebot_trabajos',{id:uid(),title:p[0]||r,detail:p[1]||'',status:'nuevo',created_at:now()});await tg(`✅ 💼 ${p[0]||r}`,cid);return;}
  if(lo==='/trabajos'){const d=await sbGet('lifebot_trabajos');if(!d.length){await tg('💼 Sin ofertas',cid);return;}await tg('💼 <b>Ofertas:</b>\n\n'+d.map((t,i)=>`${i+1}. ${t.title} [${t.status}]${t.detail?'\n   '+t.detail:''}`).join('\n'),cid);return;}
  if(lo.startsWith('/tarea ')){await sbInsert('lifebot_data',{id:uid(),type:'tarea',title:text.slice(7).trim(),status:'pendiente',created_at:now()});await tg(`✅ 📌 ${text.slice(7).trim()}`,cid);return;}
  if(lo==='/tareas'){const d=await sbGet('lifebot_data','&type=eq.tarea');if(!d.length){await tg('📌 Sin tareas',cid);return;}await tg('📌 <b>Tareas:</b>\n\n'+d.map(t=>`${t.status==='completado'?'✅':'⬜'} ${t.title}`).join('\n'),cid);return;}
  if(lo.startsWith('/nota ')){const r=text.slice(6).trim();const secs={finanzas:'fin',objetivos:'obj',cursos:'cur',pisos:'pis',trabajo:'trb'};const fw=r.split(/\s+/)[0].toLowerCase();const cat=secs[fw]||'fin';const rest=r.slice(fw.length).trim(),p=rest.split('—').map(s=>s.trim());await sbInsert('lifebot_notes',{id:uid(),category:cat,title:p[0]||'Nota',content:p[1]||'',created_at:now()});await tg(`✅ 📝 ${p[0]||'Nota'}`,cid);return;}
  if(lo.startsWith('/del ')){const pts=text.slice(5).trim().split(/\s+/);const tm={guardia:'guardia',evento:'evento',curso:'curso',objetivo:'objetivo',gasto:'gasto',ingreso:'ingreso',tarea:'tarea'};const tw=pts[0].toLowerCase(),q=pts.slice(1).join(' ').toLowerCase();if(tw==='piso'){const it=await sbGet('lifebot_pisos');const f=it.find(i=>i.title.toLowerCase().includes(q));if(f){await sbDelete('lifebot_pisos',f.id);await tg(`🗑️ ${f.title}`,cid);}else await tg('❌ No encontrado',cid);}else if(tw==='trabajo'){const it=await sbGet('lifebot_trabajos');const f=it.find(i=>i.title.toLowerCase().includes(q));if(f){await sbDelete('lifebot_trabajos',f.id);await tg(`🗑️ ${f.title}`,cid);}else await tg('❌ No encontrado',cid);}else if(tm[tw]){const it=await sbGet('lifebot_data',`&type=eq.${tm[tw]}`);let f;if(tw==='guardia'&&/^\d+$/.test(q))f=it.find(i=>i.day===parseInt(q));else f=it.find(i=>i.title.toLowerCase().includes(q));if(f){await sbDelete('lifebot_data',f.id);await tg(`🗑️ ${f.title}`,cid);}else await tg('❌ No encontrado',cid);}else await tg('⚠️ /del TIPO búsqueda',cid);return;}
  if(lo==='/resumen'){const[gd,ev,cu,ob,ga,ig,ta,pi,tr]=await Promise.all([sbGet('lifebot_data','&type=eq.guardia'),sbGet('lifebot_data','&type=eq.evento'),sbGet('lifebot_data','&type=eq.curso'),sbGet('lifebot_data','&type=eq.objetivo'),sbGet('lifebot_data','&type=eq.gasto'),sbGet('lifebot_data','&type=eq.ingreso'),sbGet('lifebot_data','&type=eq.tarea'),sbGet('lifebot_pisos'),sbGet('lifebot_trabajos')]);const tG=ga.reduce((s,x)=>s+(x.amount||0),0),tI=ig.reduce((s,x)=>s+(x.amount||0),0);await tg(`📋 <b>RESUMEN</b>\n🚨${gd.length} 📅${ev.length} 📚${cu.length} 🎯${ob.filter(o=>o.status==='completado').length}/${ob.length} 📌${ta.filter(t=>t.status==='completado').length}/${ta.length} 🏠${pi.length} 💼${tr.length}\n💰€${(tI-tG).toFixed(2)}${tI-tG>=0?' 🟢':' 🔴'}`,cid);return;}
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'LifeBot Active ✅' };
  try {
    const body = JSON.parse(event.body);
    
    // ALWAYS forward to OpenClaw NucBox
    fwd(body);
    
    const msg = body.message;
    if (!msg || !msg.text) return { statusCode: 200, body: 'ok' };
    const chatId = String(msg.chat.id);
    if (chatId !== TG_CHAT) return { statusCode: 200, body: 'no' };
    const text = msg.text.trim(), lo = text.toLowerCase();

    // If LifeBot command → handle it
    if (isLB(lo)) { await handle(text, lo, chatId); return { statusCode: 200, body: 'ok' }; }

    // Natural language → Groq AI responds to EVERYTHING
    const [gd,cu,ob,ta,pi,tr] = await Promise.all([
      sbGet('lifebot_data','&type=eq.guardia&limit=5'),sbGet('lifebot_data','&type=eq.curso&limit=5'),
      sbGet('lifebot_data','&type=eq.objetivo&limit=5'),sbGet('lifebot_data','&type=eq.tarea&limit=5'),
      sbGet('lifebot_pisos','&limit=3'),sbGet('lifebot_trabajos','&limit=3')
    ]);
    const sysP=`Eres LifeBot, asistente personal de Carlos Galera, MIR en Murcia. Siempre respondes en español, de forma concisa y útil. Hoy: ${new Date().toLocaleDateString('es-ES')}.
DATOS ACTUALES: Guardias:${gd.map(g=>'D'+g.day+':'+g.title).join(',')||'ninguna'} Cursos:${cu.map(c=>c.title+'['+c.status+']').join(',')||'ninguno'} Objetivos:${ob.map(o=>o.title).join(',')||'ninguno'} Tareas:${ta.map(t=>t.title).join(',')||'ninguna'} Pisos:${pi.map(p=>p.title).join(',')||'ninguno'} Ofertas:${tr.map(t=>t.title).join(',')||'ninguna'}
Si el usuario quiere AÑADIR, ELIMINAR o COMPLETAR algo, responde SOLO con JSON: {"action":"add|del|done","type":"guardia|evento|curso|objetivo|gasto|ingreso|tarea|piso|trabajo","data":{"title":"","detail":"","day":0,"amount":0},"reply":"texto de confirmación"}
Si es conversación general, saludo, pregunta o consulta, responde con texto normal. Sé motivador, práctico y amable.`;
    const resp=await ai(sysP,text);
    const jm=resp.match(/\{[\s\S]*\}/);
    if(jm){try{const cmd=JSON.parse(jm[0]);const p=cmd.data||{};if(cmd.action==='add'){if(cmd.type==='piso')await sbInsert('lifebot_pisos',{id:uid(),title:p.title||'',detail:p.detail||'',status:'nuevo',created_at:now()});else if(cmd.type==='trabajo')await sbInsert('lifebot_trabajos',{id:uid(),title:p.title||'',detail:p.detail||'',status:'nuevo',created_at:now()});else{const e={id:uid(),type:cmd.type,title:p.title||'',detail:p.detail||'',status:'pendiente',created_at:now()};if(p.day)e.day=p.day;if(p.amount)e.amount=p.amount;await sbInsert('lifebot_data',e);}}if(cmd.action==='del'){const q=(p.query||p.title||'').toLowerCase();if(cmd.type==='piso'){const it=await sbGet('lifebot_pisos');const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_pisos',f.id);}else if(cmd.type==='trabajo'){const it=await sbGet('lifebot_trabajos');const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_trabajos',f.id);}else{const it=await sbGet('lifebot_data',`&type=eq.${cmd.type}`);const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_data',f.id);}}if(cmd.action==='done'){const q=(p.query||p.title||'').toLowerCase();const it=await sbGet('lifebot_data',`&type=eq.${cmd.type}`);const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbUpdate('lifebot_data',f.id,{status:'completado'});}await tg(cmd.reply||'✅',chatId);}catch(e){await tg(resp.replace(/\{[\s\S]*\}/,'').trim()||'✅',chatId);}}
    else{await tg(resp,chatId);}

    return {statusCode:200,body:'ok'};
  } catch(e) { console.error(e); return {statusCode:200,body:'err'}; }
};
