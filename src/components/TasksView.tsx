import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }
type Task = { id: number; title: string; priority: 'alta'|'media'|'baja'; done: boolean; dueDate: string; tag: string; };
const PRIS = [{v:'alta',l:'🔴 Alta',c:'#f87171'},{v:'media',l:'🟡 Media',c:'#f59e0b'},{v:'baja',l:'🟢 Baja',c:'#3fb950'}];
const TAGS = ['Personal','Médico','Admin','Estudio','Casa','Otro'];

const TasksView: React.FC<Props> = () => {
  const [tasks, setTasks] = useState<Task[]>(()=>{ try{return JSON.parse(localStorage.getItem('fh_tasks')||'[]')}catch{return []} });
  const [title, setTitle] = useState('');
  const [pri, setPri] = useState<'alta'|'media'|'baja'>('media');
  const [due, setDue] = useState('');
  const [tag, setTag] = useState('Personal');
  const [filter, setFilter] = useState('todas');

  const save = (t: Task[]) => { setTasks(t); localStorage.setItem('fh_tasks', JSON.stringify(t)); };
  const add = () => {
    if(!title.trim()) return;
    save([{id:Date.now(),title,priority:pri,done:false,dueDate:due,tag},...tasks]);
    setTitle(''); setDue('');
  };
  const tog = (id:number) => save(tasks.map(t=>t.id===id?{...t,done:!t.done}:t));

  const filtered = tasks.filter(t => filter==='todas'?true : filter==='pendientes'?!t.done : filter==='completadas'?t.done : t.priority===filter);
  const pending = tasks.filter(t=>!t.done);
  const priMap: Record<string,string> = {alta:'#f87171',media:'#f59e0b',baja:'#3fb950'};
  const ctx = `Tareas pendientes: ${pending.length}. Alta prioridad: ${pending.filter(t=>t.priority==='alta').length}. Detalle: ${pending.slice(0,10).map(t=>`[${t.priority}] ${t.title}${t.dueDate?' ('+t.dueDate+')':''}`).join('; ')}`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">✅</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Tareas y Brain</h2><p className="text-xs text-slate-400">{pending.length} pendientes · {tasks.filter(t=>t.done).length} completadas</p></div>
      </div>
      {/* Add */}
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155'}}>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Nueva tarea..." style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
          <button onClick={add} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#6366f1',color:'white',fontWeight:600,cursor:'pointer'}}>+</button>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {PRIS.map(p=><button key={p.v} onClick={()=>setPri(p.v as any)} style={{padding:'4px 10px',borderRadius:20,border:`1px solid ${p.c}`,background:pri===p.v?p.c+'33':'transparent',color:p.c,fontSize:11,fontWeight:600,cursor:'pointer'}}>{p.l}</button>)}
          <select value={tag} onChange={e=>setTag(e.target.value)} style={{padding:'4px 8px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}}>
            {TAGS.map(t=><option key={t}>{t}</option>)}
          </select>
          <input type="date" value={due} onChange={e=>setDue(e.target.value)} style={{padding:'4px 8px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}} />
        </div>
      </div>
      {/* Filter */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {['todas','pendientes','completadas','alta','media','baja'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'4px 12px',borderRadius:20,border:'1px solid #334155',background:filter===f?'#6366f1':'transparent',color:filter===f?'white':'#94a3b8',fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{f}</button>
        ))}
      </div>
      {/* Tasks */}
      <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:300,overflowY:'auto'}}>
        {filtered.map(t=>(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#1e293b',borderRadius:10,border:'1px solid #334155',opacity:t.done?.7:1}}>
            <input type="checkbox" checked={t.done} onChange={()=>tog(t.id)} style={{width:16,height:16,cursor:'pointer',accentColor:'#6366f1'}} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0',textDecoration:t.done?'line-through':'none'}}>{t.title}</div>
              <div style={{display:'flex',gap:6,marginTop:2}}>
                <span style={{fontSize:10,color:priMap[t.priority]}}>{t.priority}</span>
                <span style={{fontSize:10,color:'#475569'}}>{t.tag}</span>
                {t.dueDate&&<span style={{fontSize:10,color:'#475569'}}>📅 {t.dueDate}</span>}
              </div>
            </div>
            <button onClick={()=>save(tasks.filter(x=>x.id!==t.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:12}}>✕</button>
          </div>
        ))}
        {!filtered.length && <div style={{textAlign:'center',color:'#475569',padding:20,fontSize:13}}>Sin tareas aquí 🎉</div>}
      </div>
      <NotebookAI sectionName="Tareas y Brain" icon="✅" accentColor="#6366f1" sectionContext={ctx} />
    </div>
  );
};
export default TasksView;
