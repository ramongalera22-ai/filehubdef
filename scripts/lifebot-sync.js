#!/usr/bin/env node
// lifebot-sync.js — Run on NucBox to save OpenClaw findings to Supabase
// Usage: node lifebot-sync.js piso "Calle Mayor 3, Murcia" "2hab, 450€, amueblado"
// Usage: node lifebot-sync.js trabajo "MFyC Centro Salud" "2200€/mes, Murcia"
// Usage: node lifebot-sync.js curso "Ecografía" "Sindicato Médico, 10h"
// Usage: node lifebot-sync.js gasto 50 "Supermercado"
// Usage: node lifebot-sync.js guardia 15 "UCI 08:00-08:00+1"
//
// Can also pipe JSON: echo '{"pisos":[{"title":"...","detail":"..."}]}' | node lifebot-sync.js --json

const SB_URL = 'https://ztigttazrdzkpxrzyast.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWd0dGF6cmR6a3B4cnp5YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTg5MzcsImV4cCI6MjA4NzU5NDkzN30.d-PQ0S_dXsTRXGdRrZDJiJOXcXFF4hEOaAGWpT3WaSM';
const HDR = {'Content-Type':'application/json','apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Prefer':'return=representation'};

const uid = () => String(Date.now()) + String(Math.floor(Math.random()*1000));
const now = () => new Date().toISOString();

async function sb(table, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST', headers: HDR, body: JSON.stringify(data)
  });
  return r.ok;
}

async function main() {
  const args = process.argv.slice(2);

  // JSON mode from stdin
  if (args[0] === '--json') {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const data = JSON.parse(input);
    
    if (data.pisos) {
      for (const p of data.pisos) {
        await sb('lifebot_pisos', {id:uid(), title:p.title||p.nombre||'', detail:p.detail||p.url||p.detalles||'', status:'nuevo', created_at:now()});
        console.log(`✅ Piso: ${p.title||p.nombre}`);
      }
    }
    if (data.trabajos || data.ofertas) {
      for (const t of (data.trabajos||data.ofertas)) {
        await sb('lifebot_trabajos', {id:uid(), title:t.title||t.nombre||'', detail:t.detail||t.url||t.detalles||'', status:'nuevo', created_at:now()});
        console.log(`✅ Trabajo: ${t.title||t.nombre}`);
      }
    }
    if (data.cursos) {
      for (const c of data.cursos) {
        await sb('lifebot_data', {id:uid(), type:'curso', title:c.title||c.nombre||'', detail:c.detail||c.detalles||'', status:'pendiente', created_at:now()});
        console.log(`✅ Curso: ${c.title||c.nombre}`);
      }
    }
    return;
  }

  // CLI mode
  const type = (args[0]||'').toLowerCase();
  
  if (type === 'piso') {
    const title = args[1] || 'Piso';
    const detail = args.slice(2).join(' ') || '';
    await sb('lifebot_pisos', {id:uid(), title, detail, status:'nuevo', created_at:now()});
    console.log(`✅ Piso guardado: ${title}`);
  }
  else if (type === 'trabajo' || type === 'empleo') {
    const title = args[1] || 'Oferta';
    const detail = args.slice(2).join(' ') || '';
    await sb('lifebot_trabajos', {id:uid(), title, detail, status:'nuevo', created_at:now()});
    console.log(`✅ Trabajo guardado: ${title}`);
  }
  else if (type === 'curso') {
    const title = args[1] || 'Curso';
    const detail = args.slice(2).join(' ') || '';
    await sb('lifebot_data', {id:uid(), type:'curso', title, detail, status:'pendiente', created_at:now()});
    console.log(`✅ Curso guardado: ${title}`);
  }
  else if (type === 'guardia') {
    const day = parseInt(args[1]) || 1;
    const title = args.slice(2).join(' ') || 'Guardia';
    await sb('lifebot_data', {id:uid(), type:'guardia', title, detail:`Día ${day}`, status:'activo', day, created_at:now()});
    console.log(`✅ Guardia día ${day}: ${title}`);
  }
  else if (type === 'gasto') {
    const amount = parseFloat(args[1]) || 0;
    const title = args.slice(2).join(' ') || 'Gasto';
    await sb('lifebot_data', {id:uid(), type:'gasto', title, amount, created_at:now()});
    console.log(`✅ Gasto: -€${amount} ${title}`);
  }
  else if (type === 'ingreso') {
    const amount = parseFloat(args[1]) || 0;
    const title = args.slice(2).join(' ') || 'Ingreso';
    await sb('lifebot_data', {id:uid(), type:'ingreso', title, amount, created_at:now()});
    console.log(`✅ Ingreso: +€${amount} ${title}`);
  }
  else if (type === 'evento') {
    const time = args[1] || '00:00';
    const title = args.slice(2).join(' ') || 'Evento';
    await sb('lifebot_data', {id:uid(), type:'evento', title, detail:time, status:'activo', created_at:now()});
    console.log(`✅ Evento: ${time} ${title}`);
  }
  else if (type === 'objetivo' || type === 'tarea') {
    const title = args.slice(1).join(' ') || '';
    await sb('lifebot_data', {id:uid(), type:type, title, status:'pendiente', created_at:now()});
    console.log(`✅ ${type}: ${title}`);
  }
  else if (type === 'nota') {
    const cat = args[1] || 'fin';
    const title = args[2] || 'Nota';
    const content = args.slice(3).join(' ') || '';
    await sb('lifebot_notes', {id:uid(), category:cat, title, content, created_at:now()});
    console.log(`✅ Nota [${cat}]: ${title}`);
  }
  else {
    console.log(`
📦 lifebot-sync — Guarda datos en Supabase/LifeBot

Uso:
  node lifebot-sync.js piso "Título" "Detalles"
  node lifebot-sync.js trabajo "Título" "Detalles"
  node lifebot-sync.js curso "Título" "Detalles"
  node lifebot-sync.js guardia 15 "UCI 08:00-08:00+1"
  node lifebot-sync.js gasto 50 "Supermercado"
  node lifebot-sync.js ingreso 1500 "Nómina"
  node lifebot-sync.js evento "10:00" "Reunión"
  node lifebot-sync.js objetivo "Aprobar ECO"
  node lifebot-sync.js tarea "Revisar protocolo"
  node lifebot-sync.js nota cur "Apuntes ECO" "contenido"

JSON desde stdin:
  echo '{"pisos":[{"title":"Centro","detail":"2hab 450€"}]}' | node lifebot-sync.js --json
`);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
