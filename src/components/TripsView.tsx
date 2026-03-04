import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }
type Trip = { id: number; destination: string; dates: string; status: 'planificando'|'confirmado'|'completado'; budget: string; notes: string; };
const STATUS_C: Record<string,string> = {planificando:'#f59e0b',confirmado:'#3b82f6',completado:'#10b981'};

const TripsView: React.FC<Props> = () => {
  const [trips, setTrips] = useState<Trip[]>(()=>{ try{return JSON.parse(localStorage.getItem('fh_trips')||'[]')}catch{return []} });
  const [dest, setDest] = useState('');
  const [dates, setDates] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const save = (t: Trip[]) => { setTrips(t); localStorage.setItem('fh_trips', JSON.stringify(t)); };
  const add = () => {
    if(!dest.trim()) return;
    save([{id:Date.now(),destination:dest,dates,status:'planificando',budget,notes},...trips]);
    setDest(''); setDates(''); setBudget(''); setNotes('');
  };
  const ctx = `Viajes: ${trips.length} total. Confirmados: ${trips.filter(t=>t.status==='confirmado').length}. Planificando: ${trips.filter(t=>t.status==='planificando').length}. Destinos: ${trips.map(t=>t.destination).join(', ')}`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">✈️</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Expediciones</h2><p className="text-xs text-slate-400">{trips.length} viajes registrados</p></div>
      </div>
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155',display:'flex',flexDirection:'column',gap:8}}>
        <div style={{display:'flex',gap:8}}>
          <input value={dest} onChange={e=>setDest(e.target.value)} placeholder="🌍 Destino..." style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
          <input value={dates} onChange={e=>setDates(e.target.value)} placeholder="Fechas (ej: Jul 2025)" style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        </div>
        <div style={{display:'flex',gap:8}}>
          <input value={budget} onChange={e=>setBudget(e.target.value)} placeholder="Presupuesto (€)" type="number" style={{width:130,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas (vuelo, hotel...)" style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        </div>
        <button onClick={add} style={{alignSelf:'flex-start',padding:'8px 20px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#06b6d4,#3b82f6)',color:'white',fontWeight:600,cursor:'pointer',fontSize:13}}>Añadir viaje ✈️</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {trips.map(t=>(
          <div key={t.id} style={{background:'#1e293b',borderRadius:12,padding:14,border:`1px solid ${STATUS_C[t.status]}44`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <span style={{fontSize:20}}>🗺️</span>
                <span style={{marginLeft:8,fontSize:15,fontWeight:700,color:'#e2e8f0'}}>{t.destination}</span>
                {t.dates && <span style={{marginLeft:8,fontSize:12,color:'#94a3b8'}}>📅 {t.dates}</span>}
              </div>
              <button onClick={()=>save(trips.filter(x=>x.id!==t.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer'}}>✕</button>
            </div>
            {t.notes && <p style={{fontSize:12,color:'#94a3b8',margin:'6px 0'}}>{t.notes}</p>}
            <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
              {t.budget && <span style={{fontSize:11,color:'#10b981',fontWeight:600}}>💰 {t.budget}€</span>}
              <select value={t.status} onChange={e=>save(trips.map(x=>x.id===t.id?{...x,status:e.target.value as any}:x))}
                style={{padding:'3px 8px',borderRadius:20,border:`1px solid ${STATUS_C[t.status]}`,background:'transparent',color:STATUS_C[t.status],fontSize:11,fontWeight:600,cursor:'pointer'}}>
                <option value="planificando">📝 Planificando</option>
                <option value="confirmado">✅ Confirmado</option>
                <option value="completado">🏆 Completado</option>
              </select>
            </div>
          </div>
        ))}
        {!trips.length && <div style={{textAlign:'center',color:'#475569',padding:30,fontSize:13}}>Sin viajes planificados ✈️</div>}
      </div>
      <NotebookAI sectionName="Expediciones" icon="✈️" accentColor="#06b6d4" sectionContext={ctx} />
    </div>
  );
};
export default TripsView;
