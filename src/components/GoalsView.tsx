import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }
type Goal = { id: number; title: string; category: string; progress: number; target: number; unit: string; deadline: string; };
const CATS = ['Personal','Profesional','Salud','Financiero','Aprendizaje','Relaciones'];
const CAT_COLOR: Record<string,string> = {Personal:'#f59e0b',Profesional:'#6366f1',Salud:'#10b981',Financiero:'#3b82f6',Aprendizaje:'#8b5cf6',Relaciones:'#ec4899'};

const GoalsView: React.FC<Props> = () => {
  const [goals, setGoals] = useState<Goal[]>(() => { try { return JSON.parse(localStorage.getItem('fh_goals')||'[]'); } catch { return []; } });
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('Personal');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');

  const save = (g: Goal[]) => { setGoals(g); localStorage.setItem('fh_goals', JSON.stringify(g)); };
  const add = () => {
    if (!title) return;
    save([{id:Date.now(),title,category:cat,progress:0,target:Number(target)||100,unit,deadline},...goals]);
    setTitle(''); setTarget(''); setUnit(''); setDeadline('');
  };
  const setProgress = (id: number, val: number) => {
    save(goals.map(g=>g.id===id?{...g,progress:Math.min(val,g.target)}:g));
  };

  const done = goals.filter(g=>g.progress>=g.target).length;
  const ctx = `Metas: ${goals.length} total, ${done} completadas. Detalle: ${goals.map(g=>`${g.title} (${g.category}): ${g.progress}/${g.target} ${g.unit}`).join('; ')}`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🎯</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Visiómetro Metas</h2><p className="text-xs text-slate-400">{done}/{goals.length} completadas</p></div>
      </div>
      {/* Add goal */}
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155'}}>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="🎯 Nueva meta (ej: Leer 12 libros este año)" style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13,boxSizing:'border-box',marginBottom:8}} />
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12,flex:1}}>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="Meta (nº)" type="number" style={{width:80,padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />
          <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="Unidad" style={{width:80,padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />
          <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />
        </div>
        <button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'white',fontWeight:600,cursor:'pointer',fontSize:13}}>Añadir meta</button>
      </div>
      {/* Goals list */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {goals.map(g=>{
          const pct = Math.round((g.progress/g.target)*100);
          const color = CAT_COLOR[g.category]||'#6366f1';
          const done = g.progress>=g.target;
          return (
            <div key={g.id} style={{background:'#1e293b',borderRadius:12,padding:14,border:`1px solid ${done?'rgba(16,185,129,.4)':'#334155'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <span style={{fontSize:13,fontWeight:700,color:'#e2e8f0'}}>{done?'✅ ':''}{g.title}</span>
                  <span style={{marginLeft:8,fontSize:10,padding:'2px 8px',borderRadius:20,background:`${color}22`,color,fontWeight:600}}>{g.category}</span>
                </div>
                <button onClick={()=>save(goals.filter(x=>x.id!==g.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:12}}>✕</button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1,height:8,borderRadius:4,background:'#334155',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:4,background:done?'#10b981':color,width:`${pct}%`,transition:'width .4s'}} />
                </div>
                <span style={{fontSize:11,color:'#94a3b8',minWidth:60}}>{g.progress}/{g.target} {g.unit}</span>
                <input type="number" defaultValue={g.progress} onBlur={e=>setProgress(g.id,Number(e.target.value))} style={{width:55,padding:'3px 6px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}} />
              </div>
              {g.deadline && <div style={{fontSize:10,color:'#475569',marginTop:4}}>📅 Deadline: {g.deadline}</div>}
            </div>
          );
        })}
        {!goals.length && <div style={{textAlign:'center',color:'#475569',padding:30,fontSize:13}}>Sin metas todavía. ¡Añade la primera! 🎯</div>}
      </div>
      <NotebookAI sectionName="Visiómetro Metas" icon="🎯" accentColor="#f59e0b" sectionContext={ctx} />
    </div>
  );
};
export default GoalsView;
