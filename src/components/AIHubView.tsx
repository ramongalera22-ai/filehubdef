import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }

const MODELS = [
  {id:'llama-3.3-70b-versatile',name:'LLaMA 3.3 70B',provider:'Groq',desc:'Rápido y potente para tareas generales',color:'#f97316'},
  {id:'llama-3.1-8b-instant',name:'LLaMA 3.1 8B',provider:'Groq',desc:'Ultra rápido para tareas simples',color:'#3b82f6'},
  {id:'mixtral-8x7b-32768',name:'Mixtral 8x7B',provider:'Groq',desc:'Contexto largo, análisis de documentos',color:'#8b5cf6'},
  {id:'gemma2-9b-it',name:'Gemma 2 9B',provider:'Groq',desc:'Eficiente de Google',color:'#10b981'},
];

const PROMPTS = [
  {label:'📝 Resumen ejecutivo',prompt:'Resume el siguiente texto en 5 puntos clave:'},
  {label:'🧠 Lluvia de ideas',prompt:'Dame 10 ideas creativas sobre:'},
  {label:'💬 Corrector',prompt:'Corrige y mejora el siguiente texto manteniendo el tono:'},
  {label:'📊 Análisis DAFO',prompt:'Haz un análisis DAFO completo sobre:'},
  {label:'✉️ Email profesional',prompt:'Escribe un email profesional para:'},
  {label:'🎯 Plan de acción',prompt:'Crea un plan de acción paso a paso para:'},
];

const AIHubView: React.FC<Props> = () => {
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

  const run = async () => {
    if(!prompt.trim()||loading) return;
    setLoading(true); setResponse('');
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${GROQ_API_KEY}`},
        body:JSON.stringify({model:selectedModel,messages:[{role:'user',content:prompt}],max_tokens:2000,temperature:0.7})
      });
      const data = await res.json();
      setResponse(data.choices?.[0]?.message?.content||'Sin respuesta');
    } catch(e:any) { setResponse(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🧠</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Centro IA Híbrida</h2><p className="text-xs text-slate-400">Acceso directo a modelos · Groq</p></div>
      </div>
      {/* Model selector */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {MODELS.map(m=>(
          <div key={m.id} onClick={()=>setSelectedModel(m.id)} style={{cursor:'pointer',background:'#1e293b',borderRadius:10,padding:'10px 12px',border:`2px solid ${selectedModel===m.id?m.color:'#334155'}`,transition:'border .2s'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
              <span style={{fontSize:12,fontWeight:700,color:'#e2e8f0'}}>{m.name}</span>
              <span style={{fontSize:9,padding:'1px 6px',borderRadius:10,background:`${m.color}22`,color:m.color,fontWeight:600}}>{m.provider}</span>
            </div>
            <div style={{fontSize:10,color:'#64748b'}}>{m.desc}</div>
          </div>
        ))}
      </div>
      {/* Quick prompts */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {PROMPTS.map(p=>(
          <button key={p.label} onClick={()=>setPrompt(p.prompt+' ')} style={{padding:'5px 10px',borderRadius:20,border:'1px solid #334155',background:'#1e293b',color:'#94a3b8',fontSize:11,cursor:'pointer',fontWeight:500}}>{p.label}</button>
        ))}
      </div>
      {/* Input */}
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155'}}>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Escribe tu pregunta o instrucción..." rows={4} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13,resize:'vertical',fontFamily:'inherit',boxSizing:'border-box',marginBottom:8}} />
        <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:'#475569'}}>Modelo: {MODELS.find(m=>m.id===selectedModel)?.name}</span>
          <button onClick={run} disabled={loading} style={{padding:'8px 24px',borderRadius:8,border:'none',background:loading?'#334155':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',fontWeight:600,cursor:loading?'default':'pointer',fontSize:13}}>
            {loading?'⏳ Pensando...':'🚀 Ejecutar'}
          </button>
        </div>
      </div>
      {/* Response */}
      {response && (
        <div style={{background:'#0f172a',borderRadius:12,padding:14,border:'1px solid #334155'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontSize:11,fontWeight:600,color:'#94a3b8'}}>🤖 Respuesta</span>
            <button onClick={()=>navigator.clipboard.writeText(response)} style={{fontSize:10,color:'#6366f1',background:'none',border:'none',cursor:'pointer'}}>📋 Copiar</button>
          </div>
          <p style={{fontSize:13,color:'#e2e8f0',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{response}</p>
        </div>
      )}
      <NotebookAI sectionName="Centro IA Híbrida" icon="🧠" accentColor="#6366f1" sectionContext="Usuario usando modelos de IA directamente en el hub" />
    </div>
  );
};
export default AIHubView;
