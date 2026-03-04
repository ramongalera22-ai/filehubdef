import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }
type Meal = { id: number; time: string; name: string; kcal: number; type: string; };
const MEAL_TYPES = ['Desayuno','Almuerzo','Comida','Merienda','Cena','Snack'];

const NutritionView: React.FC<Props> = () => {
  const [meals, setMeals] = useState<Meal[]>(() => { try { return JSON.parse(localStorage.getItem('fh_nutrition')||'[]'); } catch { return []; } });
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [mtype, setMtype] = useState('Comida');
  const today = new Date().toLocaleDateString('es-ES');
  const todayMeals = meals.filter(m=>m.time===today);
  const totalKcal = todayMeals.reduce((a,m)=>a+m.kcal,0);

  const save = (m: Meal[]) => { setMeals(m); localStorage.setItem('fh_nutrition', JSON.stringify(m)); };
  const add = () => {
    if (!name) return;
    save([{id:Date.now(),time:today,name,kcal:Number(kcal)||0,type:mtype},...meals]);
    setName(''); setKcal('');
  };

  const ctx = `Comidas hoy (${today}): ${todayMeals.map(m=>`${m.type}: ${m.name} (${m.kcal}kcal)`).join(', ')}. Total hoy: ${totalKcal}kcal. Total registros: ${meals.length}`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🥗</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Nutrición</h2><p className="text-xs text-slate-400">Registro de comidas · Análisis nutricional IA</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div style={{background:'#1e293b',borderRadius:10,padding:'12px 14px',border:'1px solid #334155',textAlign:'center'}}>
          <div style={{fontSize:11,color:'#94a3b8'}}>Kcal hoy</div>
          <div style={{fontSize:24,fontWeight:700,color:totalKcal>2500?'#f87171':'#10b981'}}>{totalKcal}</div>
        </div>
        <div style={{background:'#1e293b',borderRadius:10,padding:'12px 14px',border:'1px solid #334155',textAlign:'center'}}>
          <div style={{fontSize:11,color:'#94a3b8'}}>Comidas hoy</div>
          <div style={{fontSize:24,fontWeight:700,color:'#3b82f6'}}>{todayMeals.length}</div>
        </div>
      </div>
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155'}}>
        <div style={{fontWeight:600,fontSize:13,color:'#e2e8f0',marginBottom:10}}>➕ Añadir comida</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          <select value={mtype} onChange={e=>setMtype(e.target.value)} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}}>
            {MEAL_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <input value={kcal} onChange={e=>setKcal(e.target.value)} placeholder="Kcal" type="number" style={{width:80,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        </div>
        <div style={{display:'flex',gap:8}}>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="¿Qué comiste? (ej: Pollo a la plancha con arroz)" style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
          <button onClick={add} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#22c55e',color:'white',fontWeight:600,cursor:'pointer',fontSize:13}}>+</button>
        </div>
      </div>
      <div style={{maxHeight:200,overflowY:'auto'}}>
        {todayMeals.map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #1e293b'}}>
            <span style={{fontSize:16}}>🍽️</span>
            <div style={{flex:1}}>
              <span style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{m.name}</span>
              <span style={{marginLeft:8,fontSize:11,color:'#64748b'}}>{m.type}</span>
            </div>
            <span style={{fontSize:12,color:'#f59e0b',fontWeight:600}}>{m.kcal} kcal</span>
            <button onClick={()=>save(meals.filter(x=>x.id!==m.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer'}}>✕</button>
          </div>
        ))}
      </div>
      <NotebookAI sectionName="Nutrición" icon="🥗" accentColor="#22c55e" sectionContext={ctx} />
    </div>
  );
};
export default NutritionView;
