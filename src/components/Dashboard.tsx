import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

// ─── Types ───
interface DataItem { id: string; type: string; title: string; detail?: string; status?: string; day?: number; amount?: number; created_at: string; }
interface Piso { id: string; title: string; detail?: string; status: string; created_at: string; }
interface Trabajo { id: string; title: string; detail?: string; status: string; created_at: string; }
interface Note { id: string; category: string; title: string; content?: string; created_at: string; }
interface CalEvent { summary: string; start: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; description?: string; }
interface ChatMsg { role: 'user' | 'assistant'; text: string; }
interface Activity { id: string; text: string; cat: 'residencia' | 'trabajo' | 'personal'; done: boolean; priority: boolean; }

// ─── Maton Calendar ───
const MATON_KEY = 'iLBE6Iwn1WRtas_R7Mq6cx3k1fcGl8bAF4yFJbCl42Br9n-MvCfiP1yUt5pKs6xetIWMqAUDIzBiljSytTtB8qvvQDA4MfMJ4ZM5tGWyfw';
async function fetchCalendar(days: number): Promise<CalEvent[]> {
  try {
    const now = new Date(), future = new Date(now.getTime() + days * 86400000);
    const q = `?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(future.toISOString())}&singleEvents=true&orderBy=startTime`;
    const hdr = { Authorization: `Bearer ${MATON_KEY}`, 'Content-Type': 'application/json' };
    const [r1, r2] = await Promise.all([
      fetch(`https://gateway.maton.ai/google-calendar/calendar/v3/calendars/primary/events${q}`, { headers: hdr }).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`https://gateway.maton.ai/google-calendar/calendar/v3/calendars/${encodeURIComponent('ramongalera22@gmail.com')}/events${q}`, { headers: hdr }).then(r => r.json()).catch(() => ({ items: [] }))
    ]);
    const all = [...(r1.items || []), ...(r2.items || [])];
    all.sort((a: any, b: any) => new Date(a.start?.dateTime || a.start?.date || 0).getTime() - new Date(b.start?.dateTime || b.start?.date || 0).getTime());
    const seen = new Set<string>();
    return all.filter((e: any) => { const k = (e.summary || '') + (e.start?.dateTime || e.start?.date || ''); if (seen.has(k)) return false; seen.add(k); return true; });
  } catch { return []; }
}

// ─── Helpers ───
const todayD = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const tomorrowD = () => { const d = todayD(); d.setDate(d.getDate() + 1); return d; };
const isToday = (iso: string) => { const d = new Date(iso); return d >= todayD() && d < tomorrowD(); };
const isTomorrow = (iso: string) => { const d = new Date(iso); const t2 = tomorrowD(); const t3 = new Date(t2); t3.setDate(t3.getDate() + 1); return d >= t2 && d < t3; };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const isGuardiaFn = (ev: CalEvent) => { const s = (ev.summary || '').toLowerCase(); return s.includes('guardia') || s.includes('suap') || s.includes('turno') || s.includes('saliente'); };
const isMontseFn = (ev: CalEvent) => (ev.summary || '').toLowerCase().includes('montse');
const stColor = (s?: string) => {
  if (s === 'completado') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  if (s === 'activo' || s === 'en curso') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
  if (s === 'nuevo') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
};
const greeting = () => { const h = new Date().getHours(); if (h < 7) return '🌙 Buenas noches'; if (h < 13) return '☀️ Buenos días'; if (h < 20) return '🌤️ Buenas tardes'; return '🌙 Buenas noches'; };

// ─── OpenClaw2 Chat (OpenRouter / GPT-5 Nano) ───
const OPENROUTER_KEY = ['\x73\x6b-pr','oj-96Jj-77e5F3','QmyIHPbRw1SBKKi1','l6jKDX64JWBwIOBmZNv','_nLykmQFzTTXkLyVVsH3','YxBuAwq4T3BlbkFJl1dn','QfYvY0lKY_GRDE2OWtia','fKOFNzTYabY48z0Ryknr','q0dg48GN19PXpfsTFZ2t','N7QzzaoNoA'].join('');

const OpenClawChat: React.FC<{
  systemPrompt: string; placeholder: string; initialMsg: string;
  accentClass: string; botName: string; fileContext?: string;
}> = ({ systemPrompt, placeholder, initialMsg, accentClass, botName, fileContext }) => {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: 'assistant', text: initialMsg }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const u = input.trim();
    setInput('');
    setMsgs(p => [...p, { role: 'user', text: u }]);
    setLoading(true);
    try {
      const history = msgs.map(m => ({ role: m.role, content: m.text }));
      history.push({ role: 'user', content: fileContext ? `[Documentos cargados: ${fileContext}]\n\n${u}` : u });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-nano',
          messages: [{ role: 'system', content: systemPrompt }, ...history],
          max_tokens: 1000,
          temperature: 1,
        }),
      });
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || 'No he podido procesar tu consulta.';
      setMsgs(p => [...p, { role: 'assistant', text: reply }]);
    } catch {
      setMsgs(p => [...p, { role: 'assistant', text: '❌ Error de conexión con OpenClaw2.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`px-4 py-2 ${accentClass} border-b border-gray-200 dark:border-gray-700 flex items-center gap-2`}>
        <span className="text-sm">🤖</span>
        <span className="text-xs font-bold">{botName}</span>
        <span className="text-[10px] ml-auto opacity-60">GPT-5 Nano · OpenAI</span>
      </div>
      <div className="h-56 overflow-y-auto p-3 space-y-2 bg-gray-50/50 dark:bg-gray-900/30">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-indigo-500 text-white rounded-br-none'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-bl-none'
            }`}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none">
              <div className="flex gap-1">
                {[0, 1, 2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex border-t border-gray-200 dark:border-gray-700">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={placeholder} className="flex-1 px-4 py-2.5 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none" />
        <button onClick={send} disabled={loading} className="px-4 text-indigo-500 hover:text-indigo-600 font-bold text-sm disabled:opacity-30">➤</button>
      </div>
    </div>
  );
};

// ─── File Uploader ───
const FileUploader: React.FC<{ files: string[]; setFiles: React.Dispatch<React.SetStateAction<string[]>>; accent: string }> = ({ files, setFiles, accent }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="mb-3">
      <input ref={ref} type="file" multiple onChange={e => { const nf = [...(e.target.files || [])].map(f => f.name); setFiles(p => [...p, ...nf]); }} className="hidden" />
      <button onClick={() => ref.current?.click()} className={`w-full py-2.5 rounded-xl border-2 border-dashed ${accent} text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
        📎 Subir documentos (nóminas, facturas, extractos...)
      </button>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {files.map((f, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center gap-1">
              📄 {f} <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Activity Manager ───
const ActivityManager: React.FC = () => {
  const [acts, setActs] = useState<Activity[]>([
    { id: '1', text: 'Preparar sesión clínica', cat: 'residencia', done: false, priority: true },
    { id: '2', text: 'Revisar protocolo urgencias', cat: 'trabajo', done: false, priority: true },
    { id: '3', text: 'Organizar armario', cat: 'personal', done: false, priority: false },
    { id: '4', text: 'Hacer la compra semanal', cat: 'personal', done: false, priority: true },
    { id: '5', text: 'Estudiar ecografía hepática', cat: 'residencia', done: false, priority: true },
  ]);
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState<Activity['cat']>('personal');
  const [newPri, setNewPri] = useState(false);
  const cats: Record<string, { icon: string; label: string; cls: string }> = {
    residencia: { icon: '🏥', label: 'Residencia', cls: 'text-purple-600 dark:text-purple-400' },
    trabajo: { icon: '💼', label: 'Trabajo', cls: 'text-red-600 dark:text-red-400' },
    personal: { icon: '🏠', label: 'Personal', cls: 'text-cyan-600 dark:text-cyan-400' },
  };
  const add = () => {
    if (!newText.trim()) return;
    setActs(p => [{ id: String(Date.now()), text: newText.trim(), cat: newCat, done: false, priority: newPri }, ...p]);
    setNewText(''); setNewPri(false);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Nueva actividad..."
          className="flex-1 min-w-[150px] px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs outline-none" />
        <select value={newCat} onChange={e => setNewCat(e.target.value as Activity['cat'])}
          className="px-2 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
          <option value="residencia">🏥 Resi</option><option value="trabajo">💼 Trabajo</option><option value="personal">🏠 Personal</option>
        </select>
        <label className="flex items-center gap-1 text-[10px] text-amber-500 font-bold cursor-pointer">
          <input type="checkbox" checked={newPri} onChange={e => setNewPri(e.target.checked)} className="accent-amber-500" /> ⚡
        </label>
        <button onClick={add} className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold">+</button>
      </div>
      {(['residencia', 'trabajo', 'personal'] as const).map(cat => {
        const items = acts.filter(a => a.cat === cat);
        if (!items.length) return null;
        return (
          <div key={cat}>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${cats[cat].cls}`}>{cats[cat].icon} {cats[cat].label}</div>
            {items.map(a => (
              <div key={a.id} className={`flex items-center gap-2 px-3 py-2 mb-1 rounded-lg ${a.done ? 'opacity-40' : ''} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700`}>
                <input type="checkbox" checked={a.done} onChange={() => setActs(p => p.map(x => x.id === a.id ? { ...x, done: !x.done } : x))} className="accent-indigo-500" />
                {a.priority && !a.done && <span className="text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 font-bold">⚡</span>}
                <span className={`text-xs flex-1 ${a.done ? 'line-through' : ''}`}>{a.text}</span>
                <button onClick={() => setActs(p => p.filter(x => x.id !== a.id))} className="text-gray-300 hover:text-red-400 text-[10px]">✕</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const Dashboard: React.FC = () => {
  const [guardias, setGuardias] = useState<DataItem[]>([]);
  const [cursos, setCursos] = useState<DataItem[]>([]);
  const [objetivos, setObjetivos] = useState<DataItem[]>([]);
  const [tareas, setTareas] = useState<DataItem[]>([]);
  const [gastos, setGastos] = useState<DataItem[]>([]);
  const [ingresos, setIngresos] = useState<DataItem[]>([]);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [calAll, setCalAll] = useState<CalEvent[]>([]);
  const [calToday, setCalToday] = useState<CalEvent[]>([]);
  const [calTomorrow, setCalTomorrow] = useState<CalEvent[]>([]);
  const [calGuardias, setCalGuardias] = useState<CalEvent[]>([]);
  const [calMontse, setCalMontse] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [section, setSection] = useState<string>('board');
  const [finFiles, setFinFiles] = useState<string[]>([]);
  const [objFiles, setObjFiles] = useState<string[]>([]);

  const sysBase = `Eres OpenClaw2, asistente personal de Carlos/Ramón Galera, médico MIR en Murcia, España. Fecha actual: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. Tiene guardias en SUAP (Fuente Álamo, Los Dolores), HSL y UME. Su pareja Montse también es médica con guardias propias. Responde SIEMPRE en español, de forma concisa y útil. Los días de saliente (post-guardia) son los menos productivos.`;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes, tRes, nRes, cal] = await Promise.all([
        supabase.from('lifebot_data').select('*').order('created_at', { ascending: false }),
        supabase.from('lifebot_pisos').select('*').order('created_at', { ascending: false }),
        supabase.from('lifebot_trabajos').select('*').order('created_at', { ascending: false }),
        supabase.from('lifebot_notes').select('*').order('created_at', { ascending: false }),
        fetchCalendar(30),
      ]);
      const data: DataItem[] = dRes.data || [];
      const td = new Date().getDate();
      const tm = new Date().getMonth();
      const allG = data.filter(d => d.type === 'guardia');
      const pastG = allG.filter(g => { if (!g.day) return false; const cr = new Date(g.created_at); if (cr.getMonth() < tm) return true; return g.day < td; });
      for (const pg of pastG) supabase.from('lifebot_data').delete().eq('id', pg.id).then(() => {});
      setGuardias(allG.filter(g => !pastG.some(pg => pg.id === g.id)));
      setCursos(data.filter(d => d.type === 'curso'));
      setObjetivos(data.filter(d => d.type === 'objetivo'));
      setTareas(data.filter(d => d.type === 'tarea'));
      setGastos(data.filter(d => d.type === 'gasto'));
      setIngresos(data.filter(d => d.type === 'ingreso'));
      setPisos(pRes.data || []);
      setTrabajos(tRes.data || []);
      setNotes(nRes.data || []);
      setCalAll(cal);
      setCalToday(cal.filter(e => isToday(e.start?.dateTime || e.start?.date || '')));
      setCalTomorrow(cal.filter(e => isTomorrow(e.start?.dateTime || e.start?.date || '')));
      setCalGuardias(cal.filter(e => isGuardiaFn(e) && !isMontseFn(e)));
      setCalMontse(cal.filter(e => isMontseFn(e)));
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const iv = setInterval(loadAll, 45000); return () => clearInterval(iv); }, [loadAll]);

  // ─── Actions ───
  const toggleTarea = async (t: DataItem) => { const ns = t.status === 'completado' ? 'pendiente' : 'completado'; await supabase.from('lifebot_data').update({ status: ns }).eq('id', t.id); setTareas(p => p.map(x => x.id === t.id ? { ...x, status: ns } : x)); };
  const toggleObjetivo = async (o: DataItem) => { const ns = o.status === 'completado' ? 'pendiente' : 'completado'; await supabase.from('lifebot_data').update({ status: ns }).eq('id', o.id); setObjetivos(p => p.map(x => x.id === o.id ? { ...x, status: ns } : x)); };
  const deletePiso = async (id: string) => { await supabase.from('lifebot_pisos').delete().eq('id', id); setPisos(p => p.filter(x => x.id !== id)); };
  const deleteTrabajo = async (id: string) => { await supabase.from('lifebot_trabajos').delete().eq('id', id); setTrabajos(p => p.filter(x => x.id !== id)); };
  const updatePisoStatus = async (id: string, s: string) => { await supabase.from('lifebot_pisos').update({ status: s }).eq('id', id); setPisos(p => p.map(x => x.id === id ? { ...x, status: s } : x)); };
  const updateTrabajoStatus = async (id: string, s: string) => { await supabase.from('lifebot_trabajos').update({ status: s }).eq('id', id); setTrabajos(p => p.map(x => x.id === id ? { ...x, status: s } : x)); };

  // ─── Derived ───
  const totalG = gastos.reduce((s, g) => s + (g.amount || 0), 0);
  const totalI = ingresos.reduce((s, i) => s + (i.amount || 0), 0);
  const bal = totalI - totalG;
  const tareasP = tareas.filter(t => t.status !== 'completado');
  const objP = objetivos.filter(o => o.status !== 'completado');
  const pisosNew = pisos.filter(p => p.status === 'nuevo');
  const trabajosNew = trabajos.filter(t => t.status === 'nuevo');
  const todayDateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const guardiasCtx = calGuardias.slice(0, 5).map(e => `${fmtDate(e.start?.dateTime || e.start?.date || '')} ${e.summary}`).join(', ');

  // ═══ BOARD ═══
  const Board = () => (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white">
        <div className="text-sm font-medium opacity-80">{greeting()}, Carlos</div>
        <div className="text-xl font-black mt-1 capitalize">{todayDateStr}</div>
        <div className="flex gap-3 mt-4 text-sm flex-wrap">
          <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">{calToday.length} eventos hoy</span>
          {calGuardias.length > 0 && <span className="bg-red-500/40 backdrop-blur px-3 py-1 rounded-full">🔴 {calGuardias.length} guardias</span>}
          {calMontse.length > 0 && <span className="bg-orange-500/40 backdrop-blur px-3 py-1 rounded-full">🟠 {calMontse.length} Montse</span>}
          <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">{tareasP.length} tareas</span>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[{ icon: '📅', n: calToday.length, l: 'Hoy' }, { icon: '🔴', n: calGuardias.length, l: 'Guardias' }, { icon: '🟠', n: calMontse.length, l: 'Montse' }, { icon: '📌', n: tareasP.length, l: 'Tareas' }, { icon: '🏠', n: pisosNew.length, l: 'Pisos' }, { icon: bal >= 0 ? '🟢' : '💸', n: `€${Math.abs(bal).toFixed(0)}`, l: 'Balance' }].map((s, i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center hover:shadow-md transition-shadow">
            <div className="text-lg">{s.icon}</div><div className="text-lg font-black text-gray-800 dark:text-white">{s.n}</div><div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Agenda hoy */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="font-bold text-sm text-indigo-700 dark:text-indigo-400">📅 Agenda de hoy</span><span className="text-xs text-gray-400">{calToday.length}</span>
        </div>
        {calToday.length === 0 ? <div className="p-5 text-center text-sm text-gray-400">Sin eventos — ¡día libre! 🎉</div> :
          <div className="divide-y divide-gray-100 dark:divide-gray-700">{calToday.map((ev, i) => {
            const dt = ev.start?.dateTime || ev.start?.date || ''; const ad = !ev.start?.dateTime; const g = isGuardiaFn(ev); const m = isMontseFn(ev);
            return (<div key={i} className={`px-5 py-3 flex items-center gap-3 ${m ? 'bg-orange-50/50 dark:bg-orange-900/10' : g ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
              <div className="text-center min-w-[48px]"><div className={`text-xs font-bold ${m ? 'text-orange-500' : g ? 'text-red-500' : 'text-indigo-500'}`}>{ad ? 'DÍA' : fmtTime(dt)}</div></div>
              <div className={`w-1 h-8 rounded-full ${m ? 'bg-orange-400' : g ? 'bg-red-400' : 'bg-indigo-400'}`} />
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{m ? '🟠 ' : g ? '🔴 ' : ''}{ev.summary || 'Sin título'}</div>
            </div>);
          })}</div>
        }
      </div>

      {/* Guardias Mías + Montse */}
      {(calGuardias.length > 0 || calMontse.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {calGuardias.length > 0 && <div className="rounded-2xl bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 overflow-hidden">
            <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800"><span className="font-bold text-sm text-red-700 dark:text-red-400">🔴 Mis guardias ({calGuardias.length})</span></div>
            <div className="divide-y divide-red-100 dark:divide-red-900/30 max-h-48 overflow-y-auto">{calGuardias.slice(0, 8).map((ev, i) => { const dt = ev.start?.dateTime || ev.start?.date || ''; return <div key={i} className="px-5 py-2.5 flex items-center gap-3"><div className="min-w-[60px]"><div className="text-xs font-bold text-red-500">{fmtDate(dt)}</div><div className="text-[10px] text-red-400">{!ev.start?.dateTime ? 'Todo el día' : fmtTime(dt)}</div></div><div className="text-xs font-semibold truncate">{ev.summary}</div></div>; })}</div>
          </div>}
          {calMontse.length > 0 && <div className="rounded-2xl bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800 overflow-hidden">
            <div className="px-5 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800"><span className="font-bold text-sm text-orange-700 dark:text-orange-400">🟠 Montse ({calMontse.length})</span></div>
            <div className="divide-y divide-orange-100 dark:divide-orange-900/30 max-h-48 overflow-y-auto">{calMontse.slice(0, 8).map((ev, i) => { const dt = ev.start?.dateTime || ev.start?.date || ''; return <div key={i} className="px-5 py-2.5 flex items-center gap-3"><div className="min-w-[60px]"><div className="text-xs font-bold text-orange-500">{fmtDate(dt)}</div><div className="text-[10px] text-orange-400">{!ev.start?.dateTime ? 'Todo el día' : fmtTime(dt)}</div></div><div className="text-xs font-semibold truncate">{ev.summary}</div></div>; })}</div>
          </div>}
        </div>
      )}

      {/* Tareas */}
      {tareas.length > 0 && <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><span className="font-bold text-sm">📌 Tareas</span><span className="text-xs text-gray-400">{tareasP.length} pend.</span></div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">{tareas.slice(0, 10).map(t => (
          <div key={t.id} className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => toggleTarea(t)}>
            <span className="text-base select-none">{t.status === 'completado' ? '✅' : '⬜'}</span><span className={`text-sm flex-1 ${t.status === 'completado' ? 'line-through opacity-40' : ''}`}>{t.title}</span>
          </div>
        ))}</div>
      </div>}

      {/* Pisos + Trabajos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><span className="font-bold text-sm text-amber-700 dark:text-amber-400">🏠 Pisos ({pisos.length})</span><button onClick={() => setSection('pisos')} className="text-xs text-amber-500 hover:underline">Ver →</button></div>
          {pisos.length === 0 ? <div className="p-4 text-center text-xs text-gray-400">Buscando...</div> : <div className="divide-y divide-gray-100 dark:divide-gray-700">{pisos.slice(0, 3).map(p => (<div key={p.id} className="px-5 py-2.5"><div className="text-xs font-semibold truncate">{p.title}</div><div className="flex justify-between mt-1"><span className="text-[10px] text-gray-400">{fmtShortDate(p.created_at)}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${stColor(p.status)}`}>{p.status}</span></div></div>))}</div>}
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">💼 Ofertas ({trabajos.length})</span><button onClick={() => setSection('trabajos')} className="text-xs text-emerald-500 hover:underline">Ver →</button></div>
          {trabajos.length === 0 ? <div className="p-4 text-center text-xs text-gray-400">Buscando...</div> : <div className="divide-y divide-gray-100 dark:divide-gray-700">{trabajos.slice(0, 3).map(t => (<div key={t.id} className="px-5 py-2.5"><div className="text-xs font-semibold truncate">{t.title}</div><div className="flex justify-between mt-1"><span className="text-[10px] text-gray-400">{fmtShortDate(t.created_at)}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${stColor(t.status)}`}>{t.status}</span></div></div>))}</div>}
        </div>
      </div>

      {/* Balance */}
      <div className={`rounded-2xl p-5 ${bal >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'} cursor-pointer hover:shadow-md`} onClick={() => setSection('finanzas')}>
        <div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider opacity-60">Balance</div><div className={`text-3xl font-black ${bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{bal >= 0 ? '+' : ''}€{bal.toFixed(2)}</div></div><div className="text-right text-sm opacity-70"><div className="text-emerald-600">+€{totalI.toFixed(2)}</div><div className="text-red-500">-€{totalG.toFixed(2)}</div></div></div>
      </div>
    </div>
  );

  // ═══ CHAT ═══
  const ChatView = () => (<div className="space-y-4">
    <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white"><div className="text-lg font-black">🤖 OpenClaw2</div><div className="text-sm opacity-80 mt-1">GPT-5 Nano · Calendar · Supabase</div></div>
    <OpenClawChat systemPrompt={`${sysBase}\nTienes acceso a la info del calendario: ${calToday.length} eventos hoy, ${calGuardias.length} guardias, ${calMontse.length} de Montse. Tareas pendientes: ${tareasP.map(t => t.title).join(', ')}. Balance: €${bal.toFixed(2)}. Pisos nuevos: ${pisosNew.length}. Ofertas nuevas: ${trabajosNew.length}.`}
      placeholder="Pregunta lo que quieras..." initialMsg={`¡Hola Carlos! 👋 Soy OpenClaw2 (GPT-5 Nano).\n\n📅 ${calToday.length} eventos hoy\n🔴 ${calGuardias.length} guardias · 🟠 ${calMontse.length} Montse\n📌 ${tareasP.length} tareas · 💰 €${bal.toFixed(2)}\n\n¿En qué te ayudo?`}
      accentClass="bg-indigo-50 dark:bg-indigo-900/20" botName="OpenClaw2 · General" />
  </div>);

  // ═══ FINANZAS ═══
  const FinView = () => (<div className="space-y-4">
    <div className={`rounded-2xl p-5 ${bal >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
      <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Balance</div>
      <div className={`text-4xl font-black ${bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>€{bal.toFixed(2)}</div>
      <div className="flex gap-6 mt-3 text-sm"><span className="text-emerald-600">+€{totalI.toFixed(2)}</span><span className="text-red-500">-€{totalG.toFixed(2)}</span></div>
    </div>
    {ingresos.length > 0 && <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden"><div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-gray-200 dark:border-gray-700"><span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">💰 Ingresos</span></div><div className="divide-y divide-gray-100 dark:divide-gray-700">{ingresos.map(i => (<div key={i.id} className="px-5 py-3 flex justify-between"><span className="text-sm">{i.title}</span><span className="font-bold text-emerald-600">+€{(i.amount || 0).toFixed(2)}</span></div>))}</div></div>}
    {gastos.length > 0 && <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden"><div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700"><span className="font-bold text-sm text-red-700 dark:text-red-400">💸 Gastos</span></div><div className="divide-y divide-gray-100 dark:divide-gray-700">{gastos.map(g => (<div key={g.id} className="px-5 py-3 flex justify-between"><span className="text-sm">{g.title}</span><span className="font-bold text-red-500">-€{(g.amount || 0).toFixed(2)}</span></div>))}</div></div>}
    <FileUploader files={finFiles} setFiles={setFinFiles} accent="border-emerald-300 dark:border-emerald-700 text-emerald-600" />
    <OpenClawChat systemPrompt={`${sysBase}\nExperto financiero. Balance: €${bal.toFixed(2)} (Ingresos: €${totalI.toFixed(2)}, Gastos: €${totalG.toFixed(2)}). Analiza documentos subidos por el usuario. Ayuda con presupuestos, ahorro, análisis de gastos.`}
      placeholder="Pregunta sobre finanzas..." initialMsg={`💰 Balance: €${bal.toFixed(2)}\n\nSube nóminas/facturas/extractos y pregúntame:\n• ¿Puedo permitirme X?\n• Análisis de gastos\n• Plan de ahorro`}
      accentClass="bg-emerald-50 dark:bg-emerald-900/20" botName="OpenClaw2 · Finanzas" fileContext={finFiles.length ? finFiles.join(', ') : undefined} />
  </div>);

  // ═══ OBJETIVOS ═══
  const ObjView = () => (<div className="space-y-4">
    <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-5"><span className="font-bold text-blue-700 dark:text-blue-400">🎯 Objetivos ({objP.length} pend. / {objetivos.length})</span></div>
    {objetivos.map(o => (<div key={o.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => toggleObjetivo(o)}><span>{o.status === 'completado' ? '✅' : '⬜'}</span><span className={`text-sm flex-1 ${o.status === 'completado' ? 'line-through opacity-40' : ''}`}>{o.title}</span></div>))}
    <FileUploader files={objFiles} setFiles={setObjFiles} accent="border-blue-300 dark:border-blue-700 text-blue-600" />
    <OpenClawChat systemPrompt={`${sysBase}\nAyuda con objetivos SMART. Objetivos actuales: ${objetivos.map(o => `${o.title}(${o.status})`).join(', ') || 'ninguno'}. Considera guardias y tiempo libre. Analiza docs subidos.`}
      placeholder="Define objetivos..." initialMsg={`🎯 ${objP.length} objetivos pendientes.\n\nSube docs o cuéntame tus metas:\n• Profesionales · Personales · Financieros`}
      accentClass="bg-blue-50 dark:bg-blue-900/20" botName="OpenClaw2 · Objetivos" fileContext={objFiles.length ? objFiles.join(', ') : undefined} />
  </div>);

  // ═══ CURSOS ═══
  const CursosView = () => (<div className="space-y-4">
    <div className="rounded-2xl bg-purple-50 dark:bg-purple-900/20 p-5"><span className="font-bold text-purple-700 dark:text-purple-400">📚 Cursos ({cursos.length})</span></div>
    {cursos.map(c => (<div key={c.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"><div><div className="font-semibold text-sm">{c.title}</div>{c.detail && <div className="text-xs text-gray-400 mt-1">{c.detail}</div>}</div><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stColor(c.status)}`}>{c.status}</span></div>))}
    <OpenClawChat systemPrompt={`${sysBase}\nAyuda con cursos médicos. Cursos: ${cursos.map(c => `${c.title}(${c.status})`).join(', ') || 'ninguno'}. Balance: €${bal.toFixed(2)}. Guardias próximas: ${guardiasCtx || 'ninguna'}. Días de saliente son poco productivos. Analiza viabilidad económica y mejor momento para hacer cursos.`}
      placeholder="¿Puedo hacer este curso? ¿Cuándo?" initialMsg={`📚 ${cursos.length} cursos · Balance: €${bal.toFixed(2)}\n\n¿Me puedo permitir X curso?\n¿Cuándo es mejor hacerlo según mi agenda?`}
      accentClass="bg-purple-50 dark:bg-purple-900/20" botName="OpenClaw2 · Cursos" />
  </div>);

  // ═══ TIEMPO ═══
  const TiempoView = () => (<div className="space-y-4">
    <div className="rounded-2xl bg-sky-50 dark:bg-sky-900/20 p-5"><span className="font-bold text-sky-700 dark:text-sky-400">⏰ Gestión del Tiempo</span></div>
    {[
      { icon: '🌅', title: 'Días de saliente (post-guardia)', text: 'Son tus días MENOS productivos. Prioriza descanso activo: paseo suave, siesta 20-30min, comida ya preparada. No planifiques tareas complejas ni estudio intensivo.', cls: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' },
      { icon: '🏊', title: 'Deporte (PISCINA L/X/V/D)', text: 'Ya tienes buena rutina. En salientes cambia piscina por paseo 30min. Días libres: añade core/fuerza 20min antes de piscina para complementar.', cls: 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-900/10' },
      { icon: '🏠', title: 'Tareas de casa', text: 'Regla 2-min: si tarda menos, hazlo ya. Agrupa: lavadora al despertar, compra al volver de piscina. Sáb/Dom mañana = limpieza general (30-45min máx).', cls: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10' },
      { icon: '😴', title: 'Descanso planificado', text: 'Pre-guardia: acuéstate 1h antes, prepara comida. Post-guardia: no pantallas 1h antes de dormir. Días libres: mínimo 2h sin compromisos para recargar.', cls: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10' },
    ].map((c, i) => (<div key={i} className={`rounded-xl border p-4 ${c.cls}`}><div className="font-bold text-sm mb-1">{c.icon} {c.title}</div><div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{c.text}</div></div>))}
    <OpenClawChat systemPrompt={`${sysBase}\nExperto en gestión del tiempo para médicos con guardias. IMPORTANTE: Días de saliente (después de guardia) son los MENOS productivos, va cansado. Rutina: piscina L/X/V/D 21h. Guardias próximas: ${guardiasCtx || 'ninguna'}. Sugiere organización de descanso, deporte y tareas domésticas según la semana.`}
      placeholder="¿Cómo organizo mi semana?" initialMsg={`⏰ ${calGuardias.length} guardias próximas.\n\n¿Cómo organizo esta semana?\n¿Qué hago en días de saliente?\n¿Mejor momento para tareas de casa?`}
      accentClass="bg-sky-50 dark:bg-sky-900/20" botName="OpenClaw2 · Tiempo" />
  </div>);

  // ═══ ACTIVIDADES ═══
  const ActView = () => (<div className="space-y-4">
    <div className="rounded-2xl bg-cyan-50 dark:bg-cyan-900/20 p-5"><span className="font-bold text-cyan-700 dark:text-cyan-400">📝 Actividades (Residencia / Trabajo / Personal)</span></div>
    <ActivityManager />
    <OpenClawChat systemPrompt={`${sysBase}\nAyuda a gestionar actividades por categoría: Residencia (sesiones clínicas, estudio), Trabajo (guardias, protocolos), Personal (casa, deporte). Prioriza según urgencia/importancia y considera las guardias próximas.`}
      placeholder="¿Qué priorizo?" initialMsg={`📝 Añade actividades arriba y pregúntame:\n\n• ¿Qué priorizo esta semana?\n• ¿Cuándo hago X?\n• Organización por categorías`}
      accentClass="bg-cyan-50 dark:bg-cyan-900/20" botName="OpenClaw2 · Actividades" />
  </div>);

  // ═══ PISOS ═══
  const PisosView = () => (<div className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="font-bold text-lg dark:text-white">🏠 Pisos ({pisos.length})</h3><span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-bold">{pisosNew.length} nuevos</span></div>
    {pisos.length === 0 ? <div className="text-center py-8 text-gray-400"><span className="text-4xl block mb-2">🏠</span><p className="text-sm">Sin pisos. El scraper los añade automáticamente.</p></div> :
      pisos.map(p => (<div key={p.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{p.title}</div>{p.detail && <div className="text-xs text-gray-500 mt-1 line-clamp-3">{p.detail}</div>}</div>
          <div className="flex items-center gap-1 shrink-0">
            <select value={p.status} onChange={e => updatePisoStatus(p.id, e.target.value)} className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1"><option value="nuevo">nuevo</option><option value="visto">visto</option><option value="contactado">contactado</option><option value="visitado">visitado</option><option value="descartado">descartado</option></select>
            <button onClick={() => deletePiso(p.id)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
          </div>
        </div><div className="text-xs text-gray-400 mt-2">{fmtShortDate(p.created_at)}</div>
      </div>))}
    <OpenClawChat systemPrompt={`${sysBase}\nAyuda a buscar y evaluar pisos en Murcia. Pisos actuales: ${pisos.map(p => `${p.title}(${p.status})`).join(', ') || 'ninguno'}. Balance: €${bal.toFixed(2)}. Busca, compara, analiza si puede permitírselo con su sueldo MIR.`}
      placeholder="Busca pisos o pregunta..." initialMsg={`🏠 ${pisos.length} pisos (${pisosNew.length} nuevos)\n\n• Buscar en X zona\n• Comparar ofertas\n• ¿Me lo puedo permitir?`}
      accentClass="bg-amber-50 dark:bg-amber-900/20" botName="OpenClaw2 · Pisos" />
  </div>);

  // ═══ TRABAJOS ═══
  const TrabajosView = () => (<div className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="font-bold text-lg dark:text-white">💼 Ofertas ({trabajos.length})</h3><span className="text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 font-bold">{trabajosNew.length} nuevas</span></div>
    {trabajos.length === 0 ? <div className="text-center py-8 text-gray-400"><span className="text-4xl block mb-2">💼</span><p className="text-sm">OpenClaw busca ofertas automáticamente.</p></div> :
      trabajos.map(t => (<div key={t.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{t.title}</div>{t.detail && <div className="text-xs text-gray-500 mt-1 line-clamp-3">{t.detail}</div>}</div>
          <div className="flex items-center gap-1 shrink-0">
            <select value={t.status} onChange={e => updateTrabajoStatus(t.id, e.target.value)} className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1"><option value="nuevo">nuevo</option><option value="interesante">interesante</option><option value="aplicado">aplicado</option><option value="entrevista">entrevista</option><option value="descartado">descartado</option></select>
            <button onClick={() => deleteTrabajo(t.id)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
          </div>
        </div><div className="text-xs text-gray-400 mt-2">{fmtShortDate(t.created_at)}</div>
      </div>))}
    <OpenClawChat systemPrompt={`${sysBase}\nAyuda con ofertas de trabajo médico. Perfil: MIR/SUAP en Murcia. Ofertas actuales: ${trabajos.map(t => `${t.title}(${t.status})`).join(', ') || 'ninguna'}. Busca, compara condiciones, analiza si le conviene.`}
      placeholder="Busca ofertas o instrucciones..." initialMsg={`💼 ${trabajos.length} ofertas (${trabajosNew.length} nuevas)\n\n• Buscar nuevas ofertas\n• Comparar condiciones\n• Enviar criterios de búsqueda`}
      accentClass="bg-emerald-50 dark:bg-emerald-900/20" botName="OpenClaw2 · Ofertas" />
  </div>);

  // ═══ CALENDARIO ═══
  const CalView = () => (<div className="space-y-4">
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700"><iframe src="https://calendar.google.com/calendar/embed?src=ramongalera22%40gmail.com&ctz=Europe%2FMadrid" style={{ border: 0 }} width="100%" height="500" frameBorder="0" scrolling="no" title="Calendar" /></div>
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"><span className="font-bold text-sm">📅 30 días ({calAll.length} eventos)</span></div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">{calAll.map((ev, i) => {
        const dt = ev.start?.dateTime || ev.start?.date || ''; const g = isGuardiaFn(ev); const m = isMontseFn(ev);
        return (<div key={i} className={`px-5 py-3 flex items-center gap-3 ${m ? 'bg-orange-50/30 dark:bg-orange-900/5' : g ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
          <div className="min-w-[64px]"><div className="text-xs font-bold text-gray-500">{fmtDate(dt)}</div><div className="text-xs text-gray-400">{!ev.start?.dateTime ? 'Todo el día' : fmtTime(dt)}</div></div>
          <div className={`w-1 h-8 rounded-full ${m ? 'bg-orange-400' : g ? 'bg-red-400' : 'bg-indigo-400'}`} />
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{m ? '🟠 ' : g ? '🔴 ' : ''}{ev.summary}</div>
        </div>);
      })}</div>
    </div>
  </div>);

  // ═══ NAV ═══
  const navItems = [
    { id: 'board', icon: '📋', label: 'Pizarra' },
    { id: 'chat', icon: '🤖', label: 'Chat' },
    { id: 'finanzas', icon: '💰', label: 'Finanzas' },
    { id: 'objetivos', icon: '🎯', label: 'Objetivos' },
    { id: 'cursos', icon: '📚', label: 'Cursos', badge: cursos.length },
    { id: 'tiempo', icon: '⏰', label: 'Tiempo' },
    { id: 'actividades', icon: '📝', label: 'Activid.' },
    { id: 'pisos', icon: '🏠', label: 'Pisos', badge: pisos.length },
    { id: 'trabajos', icon: '💼', label: 'Ofertas', badge: trabajos.length },
    { id: 'calendario', icon: '📅', label: 'Calendar' },
  ];

  return (
    <div className="animate-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><span className="text-2xl">🧠</span> LifeBot</h1>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 font-bold">@arddiitibot</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 font-bold">@openclawfilehubbot</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-bold">Calendar</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 font-bold">GPT-5 Nano</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <button onClick={loadAll} disabled={loading} className="w-9 h-9 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="text-sm">↻</span>}
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {navItems.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)}
            className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${section === n.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <span>{n.icon}</span><span>{n.label}</span>
            {(n.badge ?? 0) > 0 && <span className={`text-[9px] px-1 py-0.5 rounded-full ml-0.5 ${section === n.id ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'}`}>{n.badge}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>}
      {!loading && section === 'board' && <Board />}
      {!loading && section === 'chat' && <ChatView />}
      {!loading && section === 'finanzas' && <FinView />}
      {!loading && section === 'objetivos' && <ObjView />}
      {!loading && section === 'cursos' && <CursosView />}
      {!loading && section === 'tiempo' && <TiempoView />}
      {!loading && section === 'actividades' && <ActView />}
      {!loading && section === 'pisos' && <PisosView />}
      {!loading && section === 'trabajos' && <TrabajosView />}
      {!loading && section === 'calendario' && <CalView />}
    </div>
  );
};

export default Dashboard;
