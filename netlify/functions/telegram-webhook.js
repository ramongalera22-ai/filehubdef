// netlify/functions/telegram-webhook.js
// LifeBot UNIFIED — Single bot: @openclawfilehubbot

const TG_TOKEN = '7853838527:AAHtI2svAQgGzwx8jVUvGxSPiOe_mRJxWFo';
const TG_CHAT = '596831448';
const GROQ_KEY = ['gsk','_9BzwjsPO7LaJ','zMyXcw9cWGdyb3FY','cVR7CwkAfZvShxoS','UNrMgzUb'].join('');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
const NUCBOX_URL = 'http://100.69.142.77:3000/telegram-webhook';
const MATON_KEY = 'iLBE6Iwn1WRtas_R7Mq6cx3k1fcGl8bAF4yFJbCl42Br9n-MvCfiP1yUt5pKs6xetIWMqAUDIzBiljSytTtB8qvvQDA4MfMJ4ZM5tGWyfw';

const SB_URL = 'https://igvadjgjpyuvzailjqwg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndmFkamdqcHl1dnphaWxqcXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDI3MTAsImV4cCI6MjA4ODAxODcxMH0.eAqKCHDzrkvMTseaBP0I_JICP1owX60-cp3agYqRz4Q';
const SB_HDR = {'Content-Type':'application/json','apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Prefer':'return=representation'};

async function sbGet(t,q=''){try{const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*&order=created_at.desc${q}`,{headers:SB_HDR});return r.ok?await r.json():[];}catch(e){return[];}}
async function sbInsert(t,d){try{await fetch(`${SB_URL}/rest/v1/${t}`,{method:'POST',headers:{...SB_HDR,'Prefer':'return=representation'},body:JSON.stringify(d)});}catch(e){}}
async function sbUpdate(t,id,d){try{await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'PATCH',headers:SB_HDR,body:JSON.stringify(d)});}catch(e){}}
async function sbDelete(t,id){try{await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:'DELETE',headers:SB_HDR});}catch(e){}}
async function tg(text,chatId){await fetch(`${TG_API}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,parse_mode:'HTML'})});}
// Claude Haiku 4.5 via OpenRouter — mismo modelo que el dashboard
const OR_KEY='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';
const OR_URL='https://openrouter.ai/api/v1/chat/completions';
async function ai(sys,msg,history=[]){
  try{
    const messages=[{role:'system',content:sys},...history,{role:'user',content:msg}];
    const r=await fetch(OR_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${OR_KEY}`,'HTTP-Referer':'https://phenomenal-nasturtium-5e1a1d.netlify.app','X-Title':'FILEHUB OpenClaw2'},
      body:JSON.stringify({model:'moonshotai/kimi-k2.5',messages,max_tokens:1000,temperature:0.7})
    });
    const d=await r.json();
    if(d.error) throw new Error(d.error.message);
    return d.choices?.[0]?.message?.content||'Sin respuesta';
  }catch(e){return'Error IA: '+e.message;}
}
const uid=()=>String(Date.now())+String(Math.floor(Math.random()*1000));
const now=()=>new Date().toISOString();

// Forward to OpenClaw NucBox (fire & forget, never blocks)
function fwd(body){fetch(NUCBOX_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>{});}

// Google Calendar via Maton API
async function maton(method,path,data=null){
  try{
    const opts={method,headers:{'Authorization':`Bearer ${MATON_KEY}`,'Content-Type':'application/json'}};
    if(data)opts.body=JSON.stringify(data);
    const r=await fetch(`https://gateway.maton.ai${path}`,opts);
    return await r.json();
  }catch(e){return{error:e.message};}
}

async function calEvents(days=7){
  try{
    const n=new Date(),f=new Date(n.getTime()+days*86400000);
    const tMin=encodeURIComponent(n.toISOString()),tMax=encodeURIComponent(f.toISOString());
    const q=`?timeMin=${tMin}&timeMax=${tMax}&singleEvents=true&orderBy=startTime`;
    // Read both primary and ramongalera22 calendars
    const [primary, ramon] = await Promise.all([
      maton('GET',`/google-calendar/calendar/v3/calendars/primary/events${q}`),
      maton('GET',`/google-calendar/calendar/v3/calendars/${encodeURIComponent('ramongalera22@gmail.com')}/events${q}`)
    ]);
    const all = [...(primary.items||[]), ...(ramon.items||[])];
    // Sort by start time and deduplicate by summary+start
    all.sort((a,b)=>new Date(a.start?.dateTime||a.start?.date||0)-new Date(b.start?.dateTime||b.start?.date||0));
    const seen=new Set();
    return all.filter(e=>{const k=(e.summary||'')+(e.start?.dateTime||e.start?.date||'');if(seen.has(k))return false;seen.add(k);return true;});
  }catch(e){return[];}
}

async function calCreate(summary,startISO,endISO,desc=''){
  return maton('POST','/google-calendar/calendar/v3/calendars/primary/events',{summary,description:desc,start:{dateTime:startISO,timeZone:'Europe/Madrid'},end:{dateTime:endISO,timeZone:'Europe/Madrid'}});
}

async function gmailList(maxResults=5){
  try{
    const d=await maton('GET',`/gmail/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:unread`);
    if(!d.messages||!d.messages.length)return[];
    const msgs=[];
    for(const m of d.messages.slice(0,5)){
      try{
        const full=await maton('GET',`/gmail/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`);
        const subj=full.payload?.headers?.find(h=>h.name==='Subject')?.value||'Sin asunto';
        const from=full.payload?.headers?.find(h=>h.name==='From')?.value||'';
        msgs.push({subject:subj,from:from.split('<')[0].trim()});
      }catch(e){}
    }
    return msgs;
  }catch(e){return[];}
}

async function driveSearch(query,max=5){
  try{
    const d=await maton('GET',`/google-drive/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${max}&fields=files(id,name,mimeType,webViewLink,modifiedTime)`);
    return d.files||[];
  }catch(e){return[];}
}

function fmtEvent(e){
  const s=new Date(e.start?.dateTime||e.start?.date);
  const allDay=!e.start?.dateTime;
  const dia=s.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
  const hora=allDay?'Todo el día':s.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'});
  return `📅 ${dia} · ${hora}\n   <b>${e.summary||'Sin título'}</b>`;
}

// LifeBot command list
const LB_CMDS = ['/help','/start','/resumen','/balance','/guardias','/eventos','/cursos','/objetivos','/tareas','/pisos','/trabajos','/calendario','/hoy','/semana','/gmail','/correo','/drive'];
const LB_PRE = ['/guardia ','/evento ','/curso ','/objetivo ','/gasto ','/ingreso ','/piso ','/trabajo ','/tarea ','/nota ','/del ','/buscar '];
function isLB(lo){return LB_CMDS.includes(lo)||LB_PRE.some(p=>lo.startsWith(p));}

async function handle(text,lo,cid){
  if(lo==='/start'||lo==='/help'){await tg(`🤖 <b>LifeBot 24/7</b>\n\n📋 /resumen /guardias /eventos /cursos /objetivos /tareas /pisos /trabajos /balance\n📅 /hoy /semana /calendario\n📧 /gmail /correo\n📁 /drive /buscar texto\n\n➕ /guardia 15 UCI\n/evento 10:00 Reunión\n/curso ECO — detalles\n/objetivo Aprobar\n/gasto 50 Super\n/ingreso 1500 Nómina\n/piso Centro 500€ — link\n/trabajo MFyC — 2200€\n/tarea Revisar protocolo\n\n🗑️ /del tipo búsqueda\n📝 /nota sección Título — texto\n🧠 Lenguaje natural → IA + Calendar + Gmail`,cid);return;}
  if(lo.startsWith('/guardia ')){const m=text.match(/\/guardia\s+(\d{1,2})\s+(.+)/i);if(!m){await tg('⚠️ /guardia DÍA nombre',cid);return;}await sbInsert('lifebot_data',{id:uid(),type:'guardia',title:m[2],detail:'Día '+m[1],status:'activo',day:parseInt(m[1]),created_at:now()});await tg(`✅ Guardia día ${m[1]}: ${m[2]}`,cid);return;}
  if(lo==='/guardias'){const d=await sbGet('lifebot_data','&type=eq.guardia');const today=new Date().getDate();const cm=new Date().getMonth();const future=d.filter(g=>{if(!g.day)return true;const c=new Date(g.created_at);if(c.getMonth()<cm)return false;return g.day>=today;});const past=d.filter(g=>!future.includes(g));for(const p of past){await sbDelete('lifebot_data',p.id);}if(!future.length){await tg('🚨 Sin guardias pendientes',cid);return;}future.sort((a,b)=>(a.day||0)-(b.day||0));await tg('🚨 <b>Guardias:</b>\n\n'+future.map(g=>`📅 Día ${g.day||'?'} — ${g.title}`).join('\n')+(past.length?`\n\n🗑️ ${past.length} guardias pasadas eliminadas`:''),cid);return;}
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
  if(lo==='/hoy'||lo==='/calendario'){const evs=await calEvents(1);if(!evs.length){await tg('📅 No tienes eventos hoy en Google Calendar',cid);return;}await tg('📅 <b>Hoy en tu calendario:</b>\n\n'+evs.map(fmtEvent).join('\n\n'),cid);return;}
  if(lo==='/semana'){const evs=await calEvents(7);if(!evs.length){await tg('📅 Sin eventos esta semana',cid);return;}await tg('📅 <b>Esta semana:</b>\n\n'+evs.map(fmtEvent).join('\n\n'),cid);return;}
  if(lo==='/gmail'||lo==='/correo'){const msgs=await gmailList(5);if(!msgs.length){await tg('📧 No hay correos sin leer',cid);return;}await tg('📧 <b>Correos sin leer:</b>\n\n'+msgs.map((m,i)=>`${i+1}. <b>${m.subject}</b>\n   De: ${m.from}`).join('\n\n'),cid);return;}
  if(lo==='/drive'){const files=await driveSearch('',10);if(!files.length){await tg('📁 No se encontraron archivos',cid);return;}await tg('📁 <b>Google Drive:</b>\n\n'+files.map((f,i)=>`${i+1}. ${f.name}`).join('\n'),cid);return;}
  if(lo.startsWith('/buscar ')){const q=text.slice(8).trim();const files=await driveSearch(`name contains '${q}'`,5);if(!files.length){await tg(`🔍 No encontré "${q}" en Drive`,cid);return;}await tg('🔍 <b>Resultados:</b>\n\n'+files.map((f,i)=>`${i+1}. ${f.name}\n   ${f.webViewLink||''}`).join('\n\n'),cid);return;}
  if(lo==='/resumen'){const[gd,ev,cu,ob,ga,ig,ta,pi,tr]=await Promise.all([sbGet('lifebot_data','&type=eq.guardia'),sbGet('lifebot_data','&type=eq.evento'),sbGet('lifebot_data','&type=eq.curso'),sbGet('lifebot_data','&type=eq.objetivo'),sbGet('lifebot_data','&type=eq.gasto'),sbGet('lifebot_data','&type=eq.ingreso'),sbGet('lifebot_data','&type=eq.tarea'),sbGet('lifebot_pisos'),sbGet('lifebot_trabajos')]);const tG=ga.reduce((s,x)=>s+(x.amount||0),0),tI=ig.reduce((s,x)=>s+(x.amount||0),0);const calEvs=await calEvents(1);const calTxt=calEvs.length?`\n\n📅 <b>Hoy:</b>\n`+calEvs.map(e=>`· ${e.summary||'?'}`).join('\n'):'';const msgs=await gmailList(3);const mailTxt=msgs.length?`\n\n📧 <b>Correos:</b> ${msgs.length} sin leer`:'';await tg(`📋 <b>RESUMEN</b>\n🚨${gd.length} 📅${ev.length} 📚${cu.length} 🎯${ob.filter(o=>o.status==='completado').length}/${ob.length} 📌${ta.filter(t=>t.status==='completado').length}/${ta.length} 🏠${pi.length} 💼${tr.length}\n💰€${(tI-tG).toFixed(2)}${tI-tG>=0?' 🟢':' 🔴'}${calTxt}${mailTxt}`,cid);return;}
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
    const [gd,cu,ob,ta,pi,tr,calEvs] = await Promise.all([
      sbGet('lifebot_data','&type=eq.guardia&limit=5'),sbGet('lifebot_data','&type=eq.curso&limit=5'),
      sbGet('lifebot_data','&type=eq.objetivo&limit=5'),sbGet('lifebot_data','&type=eq.tarea&limit=5'),
      sbGet('lifebot_pisos','&limit=3'),sbGet('lifebot_trabajos','&limit=3'),calEvents(3)
    ]);
    const calTxt=calEvs.length?calEvs.map(e=>{const s=new Date(e.start?.dateTime||e.start?.date);return s.toLocaleDateString('es-ES',{weekday:'short',day:'numeric'})+' '+(!e.start?.dateTime?'todo el día':s.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}))+': '+e.summary;}).join(', '):'vacío';
    const gmailMsgs=await gmailList(3);
    const gmailTxt=gmailMsgs.length?gmailMsgs.map(m=>m.from+': '+m.subject).join(', '):'sin correos nuevos';
    const sysP=`Eres LifeBot, asistente personal de Carlos Galera, MIR en Murcia. Siempre respondes en español, de forma concisa y útil. Hoy: ${new Date().toLocaleDateString('es-ES')}.
DATOS ACTUALES: Guardias:${gd.map(g=>'D'+g.day+':'+g.title).join(',')||'ninguna'} Cursos:${cu.map(c=>c.title+'['+c.status+']').join(',')||'ninguno'} Objetivos:${ob.map(o=>o.title).join(',')||'ninguno'} Tareas:${ta.map(t=>t.title).join(',')||'ninguna'} Pisos:${pi.map(p=>p.title).join(',')||'ninguno'} Ofertas:${tr.map(t=>t.title).join(',')||'ninguna'}
GOOGLE CALENDAR (próximos 3 días): ${calTxt}
GMAIL (sin leer): ${gmailTxt}
Tienes acceso a Google Calendar, Gmail y Google Drive de Carlos. Si pregunta por su calendario, correos, agenda, archivos o documentos, usa estos datos para responder con precisión.
Si el usuario quiere AÑADIR, ELIMINAR o COMPLETAR algo, responde SOLO con JSON: {"action":"add|del|done","type":"guardia|evento|curso|objetivo|gasto|ingreso|tarea|piso|trabajo","data":{"title":"","detail":"","day":0,"amount":0},"reply":"texto de confirmación"}
Si es conversación general, saludo, pregunta o consulta, responde con texto normal. Sé motivador, práctico y amable.`;
    const resp=await ai(sysP,text);
    const jm=resp.match(/\{[\s\S]*\}/);
    if(jm){try{const cmd=JSON.parse(jm[0]);const p=cmd.data||{};if(cmd.action==='add'){if(cmd.type==='piso')await sbInsert('lifebot_pisos',{id:uid(),title:p.title||'',detail:p.detail||'',status:'nuevo',created_at:now()});else if(cmd.type==='trabajo')await sbInsert('lifebot_trabajos',{id:uid(),title:p.title||'',detail:p.detail||'',status:'nuevo',created_at:now()});else{const e={id:uid(),type:cmd.type,title:p.title||'',detail:p.detail||'',status:'pendiente',created_at:now()};if(p.day)e.day=p.day;if(p.amount)e.amount=p.amount;await sbInsert('lifebot_data',e);}}if(cmd.action==='del'){const q=(p.query||p.title||'').toLowerCase();if(cmd.type==='piso'){const it=await sbGet('lifebot_pisos');const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_pisos',f.id);}else if(cmd.type==='trabajo'){const it=await sbGet('lifebot_trabajos');const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_trabajos',f.id);}else{const it=await sbGet('lifebot_data',`&type=eq.${cmd.type}`);const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbDelete('lifebot_data',f.id);}}if(cmd.action==='done'){const q=(p.query||p.title||'').toLowerCase();const it=await sbGet('lifebot_data',`&type=eq.${cmd.type}`);const f=it.find(i=>i.title.toLowerCase().includes(q));if(f)await sbUpdate('lifebot_data',f.id,{status:'completado'});}await tg(cmd.reply||'✅',chatId);}catch(e){await tg(resp.replace(/\{[\s\S]*\}/,'').trim()||'✅',chatId);}}
    else{await tg(resp,chatId);}

    return {statusCode:200,body:'ok'};
  } catch(e) { console.error(e); return {statusCode:200,body:'err'}; }
};
