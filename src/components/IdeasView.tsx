import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }
type Idea = { id: number; title: string; description: string; category: string; status: 'nueva'|'explorando'|'descartada'|'ejecutando'; date: string; };
const CATS = ['Proyecto','Negocio','Personal','Médico','Tecnología','Creativo','Otro'];
const STATUS_C: Record<string,string> = {nueva:'#3b82f6',explorando:'#f59e0b',ejecutando:'#10b981',descartada:'#6b7280'};

const IdeasView: React.FC<Props> = () => {
  const [ideas, setIdeas] = useState<Idea[]>(()=>{ try{return JSON.parse(localStorage.getItem('fh_ideas')||'[]')}catch{return []} });
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Personal');

  const save = (i: Idea[]) => { setIdeas(i); localStorage.setItem('fh_ideas', JSON.stringify(i)); };
  const add = () => {
    if(!title.trim()) return;
    save([{id:Date.now(),title,description:desc,category:cat,status:'nueva',date:new Date().toLocaleDateString('es-ES')},...ideas]);
    setTitle(''); setDesc('');
  };
  const setStatus = (id:number, status: Idea['status']) => save(ideas.map(i=>i.id===id?{...i,status}:i));
  const ctx = `Ideas totales: ${ideas.length}. Ejecutando: ${ideas.filter(i=>i.status==='ejecutando').length}. Explorando: ${ideas.filter(i=>i.status==='explorando').length}. Lista: ${ideas.slice(0,8).map(i=>`${i.title} [${i.status}]`).join('; ')}`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">💡</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Ideas Lab</h2><p className="text-xs text-slate-400">{ideas.length} ideas · {ideas.filter(i=>i.status==='ejecutando').length} en ejecución</p></div>
      </div>
      <div style={{display:'flex',gap:8,background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155',flexDirection:'column'}}>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="💡 Nueva idea..." style={{padding:'8px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descríbela... (problema que resuelve, cómo funciona)" rows={2} style={{padding:'8px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13,resize:'none',fontFamily:'inherit'}} />
        <div style={{display:'flex',gap:8}}>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={{flex:1,padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <button onClick={add} style={{padding:'6px 20px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#eab308,#f97316)',color:'white',fontWeight:600,cursor:'pointer',fontSize:13}}>Guardar 💡</button>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:320,overflowY:'auto'}}>
        {ideas.map(idea=>(
          <div key={idea.id} style={{background:'#1e293b',borderRadius:12,padding:12,border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
              <div>
                <span style={{fontSize:13,fontWeight:700,color:'#e2e8f0'}}>{idea.title}</span>
                <span style={{marginLeft:6,fontSize:10,padding:'2px 7px',borderRadius:20,background:'#1e293b',border:'1px solid #334155',color:'#94a3b8'}}>{idea.category}</span>
              </div>
              <button onClick={()=>save(ideas.filter(x=>x.id!==idea.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:11}}>✕</button>
            </div>
            {idea.description && <p style={{fontSize:12,color:'#94a3b8',marginBottom:8,lineHeight:1.5}}>{idea.description}</p>}
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {(['nueva','explorando','ejecutando','descartada'] as const).map(s=>(
                <button key={s} onClick={()=>setStatus(idea.id,s)} style={{padding:'3px 10px',borderRadius:20,border:`1px solid ${STATUS_C[s]}`,background:idea.status===s?STATUS_C[s]+'33':'transparent',color:STATUS_C[s],fontSize:10,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{s}</button>
              ))}
            </div>
          </div>
        ))}
        {!ideas.length && <div style={{textAlign:'center',color:'#475569',padding:30,fontSize:13}}>Sin ideas todavía. ¡Empieza a capturar! 💡</div>}
      </div>
      <NotebookAI sectionName="Ideas Lab" icon="💡" accentColor="#eab308" sectionContext={ctx} />
    </div>
  );
};
export default IdeasView;
