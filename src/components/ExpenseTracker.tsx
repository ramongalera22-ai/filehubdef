import React, { useState, useRef, useCallback } from 'react';
import { Expense } from '../types';

interface Props {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateExpense: (id: string, expense: Partial<Expense>) => void;
  [key: string]: any;
}

const CATEGORIES = ['Alimentación', 'Transporte', 'Vivienda', 'Ocio', 'Salud', 'Suscripciones', 'Nómina', 'Transferencia', 'Otros'];
const CAT_COLORS: Record<string, string> = {
  Alimentación: '#34d399', Transporte: '#f59e0b', Vivienda: '#60a5fa',
  Ocio: '#a78bfa', Salud: '#f87171', Suscripciones: '#fb923c',
  Nómina: '#3fb950', Transferencia: '#58a6ff', Otros: '#94a3b8',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

const ExpenseTracker: React.FC<Props> = ({ expenses, onAddExpense, onDeleteExpense }) => {
  const [tab, setTab] = useState<'resumen' | 'transacciones' | 'chat' | 'pdf'>('resumen');
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<{ name: string; count: number }[]>([]);
  const [pdfError, setPdfError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const gastos = expenses.filter(e => e.amount > 0);
  const ingresos = expenses.filter(e => e.amount < 0);
  const totalGastos = gastos.reduce((s, e) => s + e.amount, 0);
  const totalIngresos = ingresos.reduce((s, e) => s + Math.abs(e.amount), 0);
  const balance = totalIngresos - totalGastos;

  const byCategory = CATEGORIES.map(cat => ({
    name: cat,
    total: gastos.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const maxCat = Math.max(...byCategory.map(c => c.total), 1);

  const buildContext = useCallback(() => {
    if (expenses.length === 0) return 'No hay transacciones registradas aún.';
    const catSummary = byCategory.map(c => `${c.name}: ${fmt(c.total)}`).join(', ');
    const recent = expenses.slice(-10).map(e =>
      `${e.date} | ${e.vendor} | ${fmt(e.amount)} | ${e.category}`
    ).join('\n');
    return `DATOS FINANCIEROS:\nBalance: ${fmt(balance)}\nIngresos: ${fmt(totalIngresos)}\nGastos: ${fmt(totalGastos)}\nPor categoría: ${catSummary}\n\nÚltimas transacciones:\n${recent}`;
  }, [expenses, balance, totalIngresos, totalGastos, byCategory]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', text: chatInput };
    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          system: `Eres un asistente financiero personal. Tienes acceso a estos datos del usuario:\n\n${buildContext()}\n\nResponde en español, de forma concisa y útil. Usa emojis con moderación.`,
          messages: newMsgs.map(m => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.map((b: any) => b.text || '').join('') || 'Sin respuesta';
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `❌ Error: ${e}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePDF = async (file: File) => {
    if (file.type !== 'application/pdf') { setPdfError('Solo se aceptan archivos PDF'); return; }
    setPdfLoading(true);
    setPdfError('');
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          system: `Extrae TODAS las transacciones del extracto bancario. Devuelve SOLO JSON válido sin markdown:
{"expenses":[{"vendor":"nombre","amount":12.50,"date":"YYYY-MM-DD","category":"Alimentación|Transporte|Vivienda|Ocio|Salud|Suscripciones|Nómina|Transferencia|Otros","description":"detalle"}]}
Los gastos: amount POSITIVO. Ingresos/abonos: amount NEGATIVO.`,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: 'Extrae todas las transacciones de este extracto bancario.' },
            ],
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((b: any) => b.text || '').join('') || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.expenses?.length) {
        parsed.expenses.forEach((e: any) => {
          onAddExpense({
            vendor: e.vendor || 'Sin nombre',
            amount: parseFloat(e.amount) || 0,
            date: e.date || new Date().toISOString().split('T')[0],
            category: e.category || 'Otros',
            description: e.description || '',
          });
        });
        setPdfFiles(prev => [...prev, { name: file.name, count: parsed.expenses.length }]);
        setTab('resumen');
      } else {
        setPdfError('No se encontraron transacciones en el PDF');
      }
    } catch (e: any) {
      setPdfError(`Error: ${e.message}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePDF(file);
  };

  const tabStyle = (t: string) => ({
    padding: '6px 14px',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    background: tab === t ? '#1e293b' : 'transparent',
    color: tab === t ? '#60a5fa' : '#64748b',
    borderBottom: tab === t ? '2px solid #60a5fa' : '2px solid transparent',
  } as React.CSSProperties);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto', padding: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: '💳 Balance', value: fmt(balance), color: balance >= 0 ? '#3fb950' : '#f85149' },
          { label: '📈 Ingresos', value: fmt(totalIngresos), color: '#3fb950' },
          { label: '📉 Gastos', value: fmt(totalGastos), color: '#f85149' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1e293b', borderRadius: 10, padding: '12px 16px', border: '1px solid #334155' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #334155', marginBottom: 16 }}>
        {[['resumen', '📊 Resumen'], ['transacciones', '📋 Transacciones'], ['chat', '💬 Chat IA'], ['pdf', '📄 Subir PDF']].map(([t, label]) => (
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t as any)}>{label}</button>
        ))}
      </div>

      {/* RESUMEN */}
      {tab === 'resumen' && (
        <div>
          {byCategory.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Sin datos todavía</div>
              <div style={{ fontSize: 13 }}>Sube un extracto bancario PDF para empezar</div>
              <button onClick={() => setTab('pdf')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 20, border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                📄 Subir PDF
              </button>
            </div>
          ) : (
            byCategory.map(cat => (
              <div key={cat.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{cat.name}</span>
                  <span style={{ color: CAT_COLORS[cat.name], fontWeight: 700 }}>{fmt(cat.total)}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#334155' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: CAT_COLORS[cat.name], width: `${(cat.total / maxCat) * 100}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TRANSACCIONES */}
      {tab === 'transacciones' && (
        <div>
          {expenses.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
              <div>No hay transacciones. <button onClick={() => setTab('pdf')} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}>Sube un PDF</button></div>
            </div>
          ) : (
            [...expenses].reverse().map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{e.vendor}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{e.date} · <span style={{ color: CAT_COLORS[e.category] || '#94a3b8' }}>{e.category}</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 700, color: e.amount < 0 ? '#3fb950' : '#f87171' }}>{fmt(e.amount)}</span>
                  <button onClick={() => onDeleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 14 }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CHAT */}
      {tab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>Asistente Financiero Haiku</div>
                <div style={{ fontSize: 13 }}>Pregúntame sobre tus gastos, ingresos o cómo ahorrar</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                  {['¿En qué gasto más?', '¿Cómo puedo ahorrar?', 'Analiza mis finanzas'].map(q => (
                    <button key={q} onClick={() => setChatInput(q)} style={{ padding: '5px 12px', borderRadius: 16, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.role === 'user' ? '#2563eb' : '#1e293b',
                  border: m.role === 'assistant' ? '1px solid #334155' : 'none',
                  fontSize: 13, lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap',
                }}>{m.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: '18px 18px 18px 4px', border: '1px solid #334155', width: 60, display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', animation: `bounce 1s ${i*0.2}s infinite` }} />)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #334155' }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Pregunta sobre tus finanzas..." style={{ flex: 1, padding: '10px 16px', borderRadius: 24, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
            <button onClick={sendChat} disabled={chatLoading} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: chatLoading ? '#334155' : '#2563eb', color: 'white', cursor: 'pointer', fontSize: 16 }}>→</button>
          </div>
        </div>
      )}

      {/* PDF */}
      {tab === 'pdf' && (
        <div>
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed #334155', borderRadius: 16, padding: '48px 20px', textAlign: 'center', cursor: 'pointer', background: pdfLoading ? '#1e293b' : 'transparent', marginBottom: 16 }}>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePDF(f); }} />
            {pdfLoading ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>Claude Haiku está leyendo el PDF...</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Extrayendo y clasificando transacciones</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Arrastra tu extracto bancario aquí</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>o haz clic · Solo archivos PDF</div>
                <div style={{ marginTop: 16, display: 'inline-block', padding: '8px 20px', borderRadius: 20, background: '#2563eb', color: 'white', fontSize: 13, fontWeight: 600 }}>Seleccionar PDF</div>
              </>
            )}
          </div>
          {pdfError && <div style={{ padding: '10px 16px', background: '#450a0a', border: '1px solid #f87171', borderRadius: 10, color: '#f87171', fontSize: 13, marginBottom: 12 }}>❌ {pdfError}</div>}
          {pdfFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155', marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: '#3fb950' }}>✓ {f.count} transacciones importadas</div>
              </div>
            </div>
          ))}
          <div style={{ padding: 14, background: '#1e293b', borderRadius: 10, border: '1px solid #334155', fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>ℹ️ Cómo funciona</div>
            <div>1. Sube tu extracto bancario en PDF</div>
            <div>2. Claude Haiku lee y extrae todas las transacciones</div>
            <div>3. Las clasifica automáticamente por categoría</div>
            <div>4. Ve al Chat IA para hacer preguntas sobre tus gastos</div>
          </div>
        </div>
      )}
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-4px);opacity:1} }`}</style>
    </div>
  );
};

export default ExpenseTracker;
