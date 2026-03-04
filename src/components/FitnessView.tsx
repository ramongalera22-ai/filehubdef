import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }

type Session = { id: number; date: string; type: string; duration: number; notes: string; };
const TYPES = ['Fuerza','Cardio','HIIT','Yoga','Natación','Ciclismo','Running','Otro'];
const TYPE_EMOJI: Record<string,string> = {Fuerza:'🏋️',Cardio:'🏃',HIIT:'⚡',Yoga:'🧘',Natación:'🏊',Ciclismo:'🚴',Running:'👟',Otro:'💪'};

const FitnessView: React.FC<Props> = () => {
  const [sessions, setSessions] = useState<Session[]>(() => { try { return JSON.parse(localStorage.getItem('fh_fitness')||'[]'); } catch { return []; } });
  const [type, setType] = useState('Fuerza');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const save = (s: Session[]) => { setSessions(s); localStorage.setItem('fh_fitness', JSON.stringify(s)); };
  const add = () => {
    if (!duration) return;
    const s: Session = { id: Date.now(), date: new Date().toLocaleDateString('es-ES'), type, duration: Number(duration), notes };
    save([s, ...sessions]);
    setDuration(''); setNotes('');
  };

  const totalMin = sessions.reduce((a,s) => a + s.duration, 0);
  const thisWeek = sessions.filter(s => { const d = new Date(); const sw = new Date(d.setDate(d.getDate()-7)); return new Date(s.date.split('/').reverse().join('-')) >= sw; });
  const ctx = `Sesiones totales: ${sessions.length}. Total minutos: ${totalMin}. Esta semana: ${thisWeek.length} sesiones. Tipos: ${[...new Set(sessions.map(s=>s.type))].join(', ')}`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">💪</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Entrenamiento</h2><p className="text-xs text-slate-400">Registra sesiones · Analiza con IA</p></div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[{l:'Sesiones',v:sessions.length,c:'#3b82f6'},{l:'Min totales',v:totalMin,c:'#10b981'},{l:'Esta semana',v:thisWeek.length,c:'#f59e0b'}].map(s=>(
          <div key={s.l} style={{background:'#1e293b',borderRadius:10,padding:'10px 14px',border:'1px solid #334155'}}>
            <div style={{fontSize:11,color:'#94a3b8'}}>{s.l}</div>
            <div style={{fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>
      {/* Add session */}
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155'}}>
        <div style={{fontWeight:600,fontSize:13,color:'#e2e8f0',marginBottom:10}}>➕ Nueva sesión</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select value={type} onChange={e=>setType(e.target.value)} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13,flex:1}}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <input type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Minutos" style={{padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13,width:90}} />
        </div>
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas (ej: 3x10 sentadillas, 5km en 28min...)" style={{width:'100%',marginTop:8,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13,boxSizing:'border-box'}} />
        <button onClick={add} style={{marginTop:8,padding:'8px 20px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'white',fontWeight:600,cursor:'pointer',fontSize:13}}>Guardar sesión</button>
      </div>
      {/* Recent sessions */}
      <div style={{maxHeight:200,overflowY:'auto'}}>
        {sessions.slice(0,10).map(s=>(
          <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #1e293b'}}>
            <span style={{fontSize:20}}>{TYPE_EMOJI[s.type]||'💪'}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{s.type} · {s.duration} min</div>
              {s.notes && <div style={{fontSize:11,color:'#64748b'}}>{s.notes}</div>}
            </div>
            <div style={{fontSize:11,color:'#475569'}}>{s.date}</div>
            <button onClick={()=>save(sessions.filter(x=>x.id!==s.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer'}}>✕</button>
          </div>
        ))}
      </div>
      <NotebookAI sectionName="Entrenamiento" icon="💪" accentColor="#3b82f6" sectionContext={ctx} />
    </div>
  );
};
export default FitnessView;
