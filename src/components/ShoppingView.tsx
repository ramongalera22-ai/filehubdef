import React, { useState } from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }
type Item = { id: number; name: string; qty: string; category: string; price: string; done: boolean; };
const CATS = ['Supermercado','Farmacia','Ropa','Tecnología','Casa','Otro'];
const CAT_E: Record<string,string> = {Supermercado:'🛒',Farmacia:'💊',Ropa:'👕',Tecnología:'💻',Casa:'🏠',Otro:'📦'};

const ShoppingView: React.FC<Props> = () => {
  const [items, setItems] = useState<Item[]>(()=>{ try{return JSON.parse(localStorage.getItem('fh_shopping')||'[]')}catch{return []} });
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [cat, setCat] = useState('Supermercado');
  const [price, setPrice] = useState('');

  const save = (i: Item[]) => { setItems(i); localStorage.setItem('fh_shopping', JSON.stringify(i)); };
  const add = () => {
    if(!name.trim()) return;
    save([{id:Date.now(),name,qty,category:cat,price,done:false},...items]);
    setName(''); setQty(''); setPrice('');
  };
  const tog = (id:number) => save(items.map(i=>i.id===id?{...i,done:!i.done}:i));
  const clearDone = () => save(items.filter(i=>!i.done));

  const pending = items.filter(i=>!i.done);
  const totalEst = items.filter(i=>!i.done&&i.price).reduce((a,i)=>a+parseFloat(i.price||'0'),0);
  const ctx = `Lista compras: ${pending.length} pendientes. Categorías: ${[...new Set(pending.map(i=>i.category))].join(', ')}. Coste estimado: ${totalEst.toFixed(2)}€`;

  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🛒</span>
        <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Lista de Compras</h2><p className="text-xs text-slate-400">{pending.length} pendientes · ~{totalEst.toFixed(0)}€</p></div>
      </div>
      <div style={{background:'#1e293b',borderRadius:12,padding:14,border:'1px solid #334155'}}>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Producto..." style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
          <input value={qty} onChange={e=>setQty(e.target.value)} placeholder="Cant." style={{width:60,padding:'7px 8px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
          <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="€" type="number" style={{width:60,padding:'7px 8px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:13}} />
        </div>
        <div style={{display:'flex',gap:8}}>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={{flex:1,padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <button onClick={add} style={{padding:'6px 16px',borderRadius:8,border:'none',background:'#a855f7',color:'white',fontWeight:600,cursor:'pointer',fontSize:13}}>+ Añadir</button>
          <button onClick={clearDone} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #334155',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:12}}>Limpiar ✓</button>
        </div>
      </div>
      {CATS.map(c=>{
        const catItems = items.filter(i=>i.category===c);
        if(!catItems.length) return null;
        return (
          <div key={c}>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>{CAT_E[c]} {c}</div>
            {catItems.map(item=>(
              <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#1e293b',borderRadius:8,border:'1px solid #334155',marginBottom:4,opacity:item.done?.6:1}}>
                <input type="checkbox" checked={item.done} onChange={()=>tog(item.id)} style={{width:16,height:16,cursor:'pointer',accentColor:'#a855f7'}} />
                <span style={{flex:1,fontSize:13,color:'#e2e8f0',textDecoration:item.done?'line-through':'none'}}>{item.name}{item.qty&&<span style={{color:'#64748b'}}> × {item.qty}</span>}</span>
                {item.price && <span style={{fontSize:11,color:'#a855f7',fontWeight:600}}>{item.price}€</span>}
                <button onClick={()=>save(items.filter(x=>x.id!==item.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:11}}>✕</button>
              </div>
            ))}
          </div>
        );
      })}
      <NotebookAI sectionName="Compras" icon="🛒" accentColor="#a855f7" sectionContext={ctx} />
    </div>
  );
};
export default ShoppingView;
