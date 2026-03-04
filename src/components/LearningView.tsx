import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }
type Resource = { id: number; title: string; type: string; url: string; progress: number; notes: string; done: boolean; };
const TYPES = ['Libro','Curso online','Podcast','Video','Artículo','Otro'];
const TYPE_E: Record<string,string> = {Libro:'📚',Curso:'💻','Curso online':'💻',Podcast:'🎙️',Video:'▶️',Artículo:'📄',Otro:'📖'};

const LearningView: React.FC<Props> = () => {
  const [resources, setResources] = useState<Resource[]>(()=>{ try{return JSON.parse(localStorage.getItem('fh_learning')||'[]')}catch{return []} });
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Libro');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const save = (r: Resource[]) => { setResources(r); localStorage.setItem('fh_learning', JSON.stringify(r)); };
  const add = () => {
    if(!title.trim()) return;
    save([{id:Date.now(),title,type,url,progress:0,notes,done:false},...resources]);
    setTitle(''); setUrl(''); setNotes('');
  };
  const setProgress = (id:number, val:number) => save(resources.map(r=>r.id===id?{...r,progress:val,done:val>=100}:r));
  const ctx = `Recursos aprendizaje: ${resources.length}. Completados: ${resources.filter(r=>r.done).length}. En progreso: ${resources.filter(r=>r.progress>0&&!r.done).length}. Lista: ${resources.slice(0,6).map(r=>`${r.title} [${r.type}] ${r.progress}%`).join('; ')}`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">📚</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Aprendizaje</h2><p className="text-xs text-slate-400">{resources.length} recursos · {resources.filter(r=>r.done).length} completados</p></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {[{l:'Total',v:resources.length,c:'#6366f1'},{l:'En curso',v:resources.filter(r=>r.progress>0&&!r.done).length,c:'#f59e0b'},{l:'Completos',v:resources.filter(r=>r.done).length,c:'#10b981'}].map(s=>(
          <div key={s.l} style={{background:'#1e293b',borderRadius:10,padding:'10px',border:'1px solid #334155',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94a3b8'}}>{s.l}</div>
            <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155',display:'flex',flexDirection:'column',gap:8}}>
        <div style={{display:'flex',gap:8}}>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título del recurso..." style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
          <select value={type} onChange={e=>setType(e.target.value)} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="🔗 Enlace (opcional)" style={{padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas..." style={{padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        <button onClick={add} style={{alignSelf:'flex-start',padding:'8px 20px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#8b5cf6,#6366f1)',color:'white',fontWeight:600,cursor:'pointer',fontSize:13}}>Añadir 📚</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:300,overflowY:'auto'}}>
        {resources.map(r=>(
          <div key={r.id} style={{background:'#1e293b',borderRadius:10,padding:12,border:'1px solid #334155',opacity:r.done?.8:1}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:18}}>{TYPE_E[r.type]||'📖'}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{r.done?'✅ ':''}{r.title}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{r.type}</div>
                </div>
              </div>
              <button onClick={()=>save(resources.filter(x=>x.id!==r.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:11}}>✕</button>
            </div>
            {r.notes && <p style={{fontSize:11,color:'#94a3b8',marginBottom:6}}>{r.notes}</p>}
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1,height:6,borderRadius:3,background:'#334155',overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:3,background:r.done?'#10b981':'#8b5cf6',width:`${r.progress}%`,transition:'width .3s'}} />
              </div>
              <span style={{fontSize:11,color:'#94a3b8',minWidth:35}}>{r.progress}%</span>
              <input type="range" min={0} max={100} value={r.progress} onChange={e=>setProgress(r.id,Number(e.target.value))} style={{width:80,accentColor:'#8b5cf6'}} />
              {r.url && <a href={r.url} target="_blank" rel="noreferrer" style={{fontSize:10,color:'#6366f1',textDecoration:'none'}}>🔗</a>}
            </div>
          </div>
        ))}
        {!resources.length && <div style={{textAlign:'center',color:'#475569',padding:30,fontSize:13}}>Sin recursos registrados 📚</div>}
      </div>
      <NotebookAI sectionName="Aprendizaje" icon="📚" accentColor="#8b5cf6" sectionContext={ctx} />
    </div>
  );
};
export default LearningView;
