import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }
type Job = { id: number; title: string; company: string; url: string; status: 'guardado'|'aplicado'|'entrevista'|'descartado'; date: string; notes: string; };
const STATUS_C: Record<string,string> = {guardado:'#94a3b8',aplicado:'#3b82f6',entrevista:'#f59e0b',descartado:'#f87171'};
const STATUS_E: Record<string,string> = {guardado:'📌',aplicado:'📤',entrevista:'🤝',descartado:'❌'};

const WorkView: React.FC<Props> = () => {
  const [jobs, setJobs] = useState<Job[]>(()=>{ try{return JSON.parse(localStorage.getItem('fh_work')||'[]')}catch{return []} });
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const save = (j: Job[]) => { setJobs(j); localStorage.setItem('fh_work', JSON.stringify(j)); };
  const add = () => {
    if(!title.trim()) return;
    save([{id:Date.now(),title,company,url,status:'guardado',date:new Date().toLocaleDateString('es-ES'),notes},...jobs]);
    setTitle(''); setCompany(''); setUrl(''); setNotes('');
  };
  const ctx = `Ofertas trabajo: ${jobs.length}. Aplicadas: ${jobs.filter(j=>j.status==='aplicado').length}. Entrevistas: ${jobs.filter(j=>j.status==='entrevista').length}. Lista: ${jobs.slice(0,6).map(j=>`${j.title} en ${j.company} [${j.status}]`).join('; ')}`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">💼</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Work Hub</h2><p className="text-xs text-slate-400">{jobs.length} ofertas · {jobs.filter(j=>j.status==='entrevista').length} entrevistas</p></div>
      </div>
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155',display:'flex',flexDirection:'column',gap:8}}>
        <div style={{display:'flex',gap:8}}>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Puesto..." style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
          <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Empresa/Centro..." style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        </div>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="🔗 Enlace oferta..." style={{padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas (salario, requisitos...)" style={{padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        <button onClick={add} style={{alignSelf:'flex-start',padding:'8px 20px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',fontWeight:600,cursor:'pointer',fontSize:13}}>Añadir oferta 💼</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
        {(['guardado','aplicado','entrevista','descartado'] as const).map(st=>{
          const count = jobs.filter(j=>j.status===st).length;
          return <div key={st} style={{background:'#1e293b',borderRadius:8,padding:'8px 12px',border:`1px solid ${STATUS_C[st]}44`,textAlign:'center'}}>
            <div style={{fontSize:16}}>{STATUS_E[st]}</div>
            <div style={{fontSize:18,fontWeight:700,color:STATUS_C[st]}}>{count}</div>
            <div style={{fontSize:10,color:'#64748b',textTransform:'capitalize'}}>{st}</div>
          </div>;
        })}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto'}}>
        {jobs.map(j=>(
          <div key={j.id} style={{background:'#1e293b',borderRadius:10,padding:12,border:`1px solid ${STATUS_C[j.status]}44`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <span style={{fontSize:13,fontWeight:700,color:'#e2e8f0'}}>{j.title}</span>
                {j.company && <span style={{marginLeft:6,fontSize:11,color:'#94a3b8'}}>@ {j.company}</span>}
              </div>
              <button onClick={()=>save(jobs.filter(x=>x.id!==j.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:11}}>✕</button>
            </div>
            {j.notes && <p style={{fontSize:11,color:'#64748b',margin:'4px 0'}}>{j.notes}</p>}
            <div style={{display:'flex',gap:8,alignItems:'center',marginTop:6,flexWrap:'wrap'}}>
              {j.url && <a href={j.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#6366f1',textDecoration:'none'}}>🔗 Ver oferta</a>}
              <select value={j.status} onChange={e=>save(jobs.map(x=>x.id===j.id?{...x,status:e.target.value as any}:x))}
                style={{padding:'3px 8px',borderRadius:20,border:`1px solid ${STATUS_C[j.status]}`,background:'transparent',color:STATUS_C[j.status],fontSize:11,fontWeight:600,cursor:'pointer'}}>
                <option value="guardado">📌 Guardado</option>
                <option value="aplicado">📤 Aplicado</option>
                <option value="entrevista">🤝 Entrevista</option>
                <option value="descartado">❌ Descartado</option>
              </select>
              <span style={{fontSize:10,color:'#475569'}}>{j.date}</span>
            </div>
          </div>
        ))}
        {!jobs.length && <div style={{textAlign:'center',color:'#475569',padding:30,fontSize:13}}>Sin ofertas registradas 💼</div>}
      </div>
      <NotebookAI sectionName="Work Hub" icon="💼" accentColor="#6366f1" sectionContext={ctx} />
    </div>
  );
};
export default WorkView;
