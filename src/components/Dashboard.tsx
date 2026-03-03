import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

// ─── Types ───────────────────────────────────────────────────
interface DataItem { id: string; type: string; title: string; detail?: string; status?: string; day?: number; amount?: number; created_at: string; }
interface Piso { id: string; title: string; detail?: string; status: string; created_at: string; }
interface Trabajo { id: string; title: string; detail?: string; status: string; created_at: string; }
interface Note { id: string; category: string; title: string; content?: string; created_at: string; }
interface CalEvent { summary: string; start: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; description?: string; }

// ─── Maton Calendar ──────────────────────────────────────────
const MATON_KEY = 'iLBE6Iwn1WRtas_R7Mq6cx3k1fcGl8bAF4yFJbCl42Br9n-MvCfiP1yUt5pKs6xetIWMqAUDIzBiljSytTtB8qvvQDA4MfMJ4ZM5tGWyfw';

async function fetchCalendar(days: number): Promise<CalEvent[]> {
  try {
    const now = new Date(), future = new Date(now.getTime() + days * 86400000);
    const q = `?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(future.toISOString())}&singleEvents=true&orderBy=startTime`;
    const hdr = { 'Authorization': `Bearer ${MATON_KEY}`, 'Content-Type': 'application/json' };
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

// ─── Helpers ─────────────────────────────────────────────────
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const tomorrow = () => { const d = today(); d.setDate(d.getDate()+1); return d; };
const isToday = (iso: string) => { const d = new Date(iso); const t = today(); const t2 = tomorrow(); return d >= t && d < t2; };
const isTomorrow = (iso: string) => { const d = new Date(iso); const t2 = tomorrow(); const t3 = new Date(t2); t3.setDate(t3.getDate()+1); return d >= t2 && d < t3; };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const isGuardia = (ev: CalEvent) => {
  const s = (ev.summary || '').toLowerCase();
  return s.includes('guardia') || s.includes('suap') || s.includes('turno') || s.includes('saliente');
};
const stColor = (s?: string) => {
  if (s === 'completado') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  if (s === 'activo') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
  if (s === 'nuevo') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
};
const uid = () => String(Date.now()) + String(Math.floor(Math.random() * 1000));
const nowISO = () => new Date().toISOString();
const greeting = () => { const h = new Date().getHours(); if (h < 7) return '🌙 Buenas noches'; if (h < 13) return '☀️ Buenos días'; if (h < 20) return '🌤️ Buenas tardes'; return '🌙 Buenas noches'; };

// ─── Dashboard ───────────────────────────────────────────────
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
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [section, setSection] = useState<'board' | 'pisos' | 'trabajos' | 'calendario' | 'finanzas' | 'cursos'>('board');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes, tRes, nRes, cal] = await Promise.all([
        supabase.from('lifebot_data').select('*').order('created_at', { ascending: false }),
        supabase.from('lifebot_pisos').select('*').order('created_at', { ascending: false }),
        supabase.from('lifebot_trabajos').select('*').order('created_at', { ascending: false }),
        supabase.from('lifebot_notes').select('*').order('created_at', { ascending: false }),
        fetchCalendar(30)
      ]);
      const data: DataItem[] = dRes.data || [];
      
      // Auto-clean: delete past guardias & eventos from Supabase
      const todayDay = new Date().getDate();
      const todayMonth = new Date().getMonth();
      const allGuardias = data.filter(d => d.type === 'guardia');
      const allEventos = data.filter(d => d.type === 'evento');
      const pastGuardias = allGuardias.filter(g => {
        if (!g.day) return false;
        // If day is less than today and we're in the same month, it's past
        // Also clean if created_at month is before current month
        const created = new Date(g.created_at);
        const createdMonth = created.getMonth();
        if (createdMonth < todayMonth) return true; // past month entirely
        return g.day < todayDay;
      });
      // Delete past guardias silently
      for (const pg of pastGuardias) {
        supabase.from('lifebot_data').delete().eq('id', pg.id).then(() => {});
      }
      
      setGuardias(allGuardias.filter(g => !pastGuardias.some(pg => pg.id === g.id)));
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
      setCalGuardias(cal.filter(isGuardia));
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const iv = setInterval(loadAll, 45000); return () => clearInterval(iv); }, [loadAll]);

  // Quick actions
  const toggleTarea = async (t: DataItem) => {
    const ns = t.status === 'completado' ? 'pendiente' : 'completado';
    await supabase.from('lifebot_data').update({ status: ns }).eq('id', t.id);
    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, status: ns } : x));
  };
  const toggleObjetivo = async (o: DataItem) => {
    const ns = o.status === 'completado' ? 'pendiente' : 'completado';
    await supabase.from('lifebot_data').update({ status: ns }).eq('id', o.id);
    setObjetivos(prev => prev.map(x => x.id === o.id ? { ...x, status: ns } : x));
  };
  const deletePiso = async (id: string) => {
    await supabase.from('lifebot_pisos').delete().eq('id', id);
    setPisos(prev => prev.filter(p => p.id !== id));
  };
  const deleteTrabajo = async (id: string) => {
    await supabase.from('lifebot_trabajos').delete().eq('id', id);
    setTrabajos(prev => prev.filter(t => t.id !== id));
  };
  const updatePisoStatus = async (id: string, status: string) => {
    await supabase.from('lifebot_pisos').update({ status }).eq('id', id);
    setPisos(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };
  const updateTrabajoStatus = async (id: string, status: string) => {
    await supabase.from('lifebot_trabajos').update({ status }).eq('id', id);
    setTrabajos(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const totalG = gastos.reduce((s, g) => s + (g.amount || 0), 0);
  const totalI = ingresos.reduce((s, i) => s + (i.amount || 0), 0);
  const bal = totalI - totalG;
  const tareasP = tareas.filter(t => t.status !== 'completado');
  const objP = objetivos.filter(o => o.status !== 'completado');
  const pisosNew = pisos.filter(p => p.status === 'nuevo');
  const trabajosNew = trabajos.filter(t => t.status === 'nuevo');
  const todayStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ─── BOARD (Main Daily View) ──────────────────────────────
  const Board = () => (
    <div className="space-y-5">
      {/* Greeting + Date */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white">
        <div className="text-sm font-medium opacity-80">{greeting()}, Carlos</div>
        <div className="text-xl font-black mt-1 capitalize">{todayStr}</div>
        <div className="flex gap-4 mt-4 text-sm">
          <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">{calToday.length} eventos hoy</span>
          {calGuardias.length > 0 && <span className="bg-red-500/40 backdrop-blur px-3 py-1 rounded-full">🚨 {calGuardias.length} guardias</span>}
          <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">{tareasP.length} tareas</span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { icon: '📅', n: calToday.length, l: 'Hoy' },
          { icon: '🚨', n: calGuardias.length, l: 'Guardias' },
          { icon: '📌', n: tareasP.length, l: 'Tareas' },
          { icon: '🏠', n: pisosNew.length, l: 'Pisos' },
          { icon: '💼', n: trabajosNew.length, l: 'Ofertas' },
          { icon: bal >= 0 ? '🟢' : '🔴', n: `€${Math.abs(bal).toFixed(0)}`, l: 'Balance' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center hover:shadow-md transition-shadow">
            <div className="text-lg">{s.icon}</div>
            <div className="text-lg font-black text-gray-800 dark:text-white">{s.n}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{s.l}</div>
          </div>
        ))}
      </div>

      {/* AGENDA HOY */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="font-bold text-sm text-indigo-700 dark:text-indigo-400">📅 Agenda de hoy</span>
          <span className="text-xs text-gray-400">{calToday.length} eventos</span>
        </div>
        {calToday.length === 0 ? (
          <div className="p-5 text-center text-sm text-gray-400">Sin eventos para hoy — ¡día libre! 🎉</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {calToday.map((ev, i) => {
              const dt = ev.start?.dateTime || ev.start?.date || '';
              const allDay = !ev.start?.dateTime;
              const guard = isGuardia(ev);
              return (
                <div key={i} className={`px-5 py-3 flex items-center gap-3 ${guard ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <div className="text-center min-w-[48px]">
                    <div className={`text-xs font-bold ${guard ? 'text-red-500' : 'text-indigo-500'}`}>{allDay ? 'DÍA' : fmtTime(dt)}</div>
                  </div>
                  <div className={`w-1 h-8 rounded-full ${guard ? 'bg-red-400' : 'bg-indigo-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{guard ? '🚨 ' : ''}{ev.summary || 'Sin título'}</div>
                    {ev.description && <div className="text-xs text-gray-400 truncate">{ev.description}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MAÑANA */}
      {calTomorrow.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
            <span className="font-bold text-sm">🔮 Mañana ({calTomorrow.length} eventos)</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {calTomorrow.map((ev, i) => {
              const dt = ev.start?.dateTime || ev.start?.date || '';
              const guard = isGuardia(ev);
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="text-xs font-bold text-gray-400 min-w-[48px] text-center">{!ev.start?.dateTime ? 'DÍA' : fmtTime(dt)}</div>
                  <div className={`w-1 h-6 rounded-full ${guard ? 'bg-red-300' : 'bg-gray-300'}`} />
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">{guard ? '🚨 ' : ''}{ev.summary || 'Sin título'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PRÓXIMAS GUARDIAS (Calendar) */}
      {calGuardias.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
            <span className="font-bold text-sm text-red-700 dark:text-red-400">🚨 Próximas guardias (Calendar)</span>
            <span className="text-xs text-red-400">{calGuardias.length}</span>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {calGuardias.slice(0, 8).map((ev, i) => {
              const dt = ev.start?.dateTime || ev.start?.date || '';
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="min-w-[64px]">
                    <div className="text-xs font-bold text-red-500">{fmtDate(dt)}</div>
                    <div className="text-xs text-red-400">{!ev.start?.dateTime ? 'Todo el día' : fmtTime(dt)}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{ev.summary}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAREAS */}
      {tareas.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-bold text-sm">📌 Tareas</span>
            <span className="text-xs text-gray-400">{tareasP.length} pendientes</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {tareas.slice(0, 10).map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => toggleTarea(t)}>
                <span className="text-base select-none">{t.status === 'completado' ? '✅' : '⬜'}</span>
                <span className={`text-sm flex-1 ${t.status === 'completado' ? 'line-through opacity-40' : 'text-gray-700 dark:text-gray-200'}`}>{t.title}</span>
                {t.detail && <span className="text-xs text-gray-400 hidden sm:block">{t.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OBJETIVOS */}
      {objetivos.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <span className="font-bold text-sm text-blue-700 dark:text-blue-400">🎯 Objetivos ({objP.length} pendientes)</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {objetivos.map(o => (
              <div key={o.id} className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => toggleObjetivo(o)}>
                <span>{o.status === 'completado' ? '✅' : '⬜'}</span>
                <span className={`text-sm flex-1 ${o.status === 'completado' ? 'line-through opacity-40' : ''}`}>{o.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CURSOS quick */}
      {cursos.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-bold text-sm text-purple-700 dark:text-purple-400">📚 Cursos</span>
            <button onClick={() => setSection('cursos')} className="text-xs text-purple-500 hover:underline">Ver todos →</button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {cursos.slice(0, 5).map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-200">{c.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stColor(c.status)}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PISOS + TRABAJOS quick preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-bold text-sm text-amber-700 dark:text-amber-400">🏠 Pisos ({pisos.length})</span>
            <button onClick={() => setSection('pisos')} className="text-xs text-amber-500 hover:underline">Ver todos →</button>
          </div>
          {pisos.length === 0 ? <div className="p-4 text-center text-xs text-gray-400">Scraper buscando...</div> :
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {pisos.slice(0, 3).map(p => (
                <div key={p.id} className="px-5 py-2.5">
                  <div className="text-xs font-semibold truncate">{p.title}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{fmtShortDate(p.created_at)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${stColor(p.status)}`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">💼 Ofertas ({trabajos.length})</span>
            <button onClick={() => setSection('trabajos')} className="text-xs text-emerald-500 hover:underline">Ver todos →</button>
          </div>
          {trabajos.length === 0 ? <div className="p-4 text-center text-xs text-gray-400">OpenClaw buscando CAMFIC...</div> :
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {trabajos.slice(0, 3).map(t => (
                <div key={t.id} className="px-5 py-2.5">
                  <div className="text-xs font-semibold truncate">{t.title}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{fmtShortDate(t.created_at)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${stColor(t.status)}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* FINANZAS quick */}
      <div className={`rounded-2xl p-5 ${bal >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => setSection('finanzas')}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider opacity-60">Balance</div>
            <div className={`text-3xl font-black ${bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{bal >= 0 ? '+' : ''}€{bal.toFixed(2)}</div>
          </div>
          <div className="text-right text-sm opacity-70">
            <div className="text-emerald-600">+€{totalI.toFixed(2)}</div>
            <div className="text-red-500">-€{totalG.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* SEMANA COMPLETA */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="font-bold text-sm">🗓️ Próximos 7 días</span>
          <button onClick={() => setSection('calendario')} className="text-xs text-indigo-500 hover:underline">Calendario completo →</button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-56 overflow-y-auto">
          {calAll.filter(e => {
            const d = new Date(e.start?.dateTime || e.start?.date || '');
            return d <= new Date(Date.now() + 7 * 86400000);
          }).slice(0, 15).map((ev, i) => {
            const dt = ev.start?.dateTime || ev.start?.date || '';
            const guard = isGuardia(ev);
            return (
              <div key={i} className={`px-5 py-2.5 flex items-center gap-3 ${guard ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                <div className="min-w-[56px] text-center">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">{fmtShortDate(dt)}</div>
                  <div className="text-[10px] text-gray-400">{!ev.start?.dateTime ? 'Día' : fmtTime(dt)}</div>
                </div>
                <div className={`w-0.5 h-6 rounded ${guard ? 'bg-red-400' : 'bg-indigo-300'}`} />
                <div className="text-xs text-gray-600 dark:text-gray-300 truncate">{guard ? '🚨 ' : ''}{ev.summary}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── PISOS Detail ──────────────────────────────────────────
  const PisosView = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-bold text-lg dark:text-white">🏠 Pisos ({pisos.length})</h3><span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-bold">{pisosNew.length} nuevos</span></div>
      {pisos.length === 0 ? <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">🏠</span><p className="text-sm">Sin pisos. El scraper los añade automáticamente.</p></div> :
        pisos.map(p => (
          <div key={p.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{p.title}</div>{p.detail && <div className="text-xs text-gray-500 mt-1 line-clamp-3">{p.detail}</div>}</div>
              <div className="flex items-center gap-1 shrink-0">
                <select value={p.status} onChange={e => updatePisoStatus(p.id, e.target.value)} className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1">
                  <option value="nuevo">nuevo</option><option value="visto">visto</option><option value="contactado">contactado</option><option value="visitado">visitado</option><option value="descartado">descartado</option>
                </select>
                <button onClick={() => deletePiso(p.id)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">{fmtShortDate(p.created_at)}</div>
          </div>
        ))
      }
    </div>
  );

  // ─── TRABAJOS Detail ───────────────────────────────────────
  const TrabajosView = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-bold text-lg dark:text-white">💼 Ofertas ({trabajos.length})</h3><span className="text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 font-bold">{trabajosNew.length} nuevas</span></div>
      {trabajos.length === 0 ? <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">💼</span><p className="text-sm">OpenClaw busca CAMFIC automáticamente.</p></div> :
        trabajos.map(t => (
          <div key={t.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{t.title}</div>{t.detail && <div className="text-xs text-gray-500 mt-1 line-clamp-3">{t.detail}</div>}</div>
              <div className="flex items-center gap-1 shrink-0">
                <select value={t.status} onChange={e => updateTrabajoStatus(t.id, e.target.value)} className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1">
                  <option value="nuevo">nuevo</option><option value="interesante">interesante</option><option value="aplicado">aplicado</option><option value="entrevista">entrevista</option><option value="descartado">descartado</option>
                </select>
                <button onClick={() => deleteTrabajo(t.id)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">{fmtShortDate(t.created_at)}</div>
          </div>
        ))
      }
    </div>
  );

  // ─── CALENDARIO Full ───────────────────────────────────────
  const CalView = () => (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <iframe src="https://calendar.google.com/calendar/embed?src=ramongalera22%40gmail.com&ctz=Europe%2FMadrid" style={{ border: 0 }} width="100%" height="500" frameBorder="0" scrolling="no" title="Calendar" />
      </div>
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <span className="font-bold text-sm">📅 30 días — Maton API ({calAll.length} eventos)</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
          {calAll.map((ev, i) => {
            const dt = ev.start?.dateTime || ev.start?.date || '';
            const guard = isGuardia(ev);
            return (
              <div key={i} className={`px-5 py-3 flex items-center gap-3 ${guard ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                <div className="min-w-[64px]"><div className="text-xs font-bold text-gray-500">{fmtDate(dt)}</div><div className="text-xs text-gray-400">{!ev.start?.dateTime ? 'Todo el día' : fmtTime(dt)}</div></div>
                <div className={`w-1 h-8 rounded-full ${guard ? 'bg-red-400' : 'bg-indigo-400'}`} />
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{guard ? '🚨 ' : ''}{ev.summary}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── FINANZAS ──────────────────────────────────────────────
  const FinView = () => (
    <div className="space-y-4">
      <div className={`rounded-2xl p-5 ${bal >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Balance total</div>
        <div className={`text-4xl font-black ${bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>€{bal.toFixed(2)}</div>
        <div className="flex gap-6 mt-3 text-sm"><span className="text-emerald-600">+€{totalI.toFixed(2)}</span><span className="text-red-500">-€{totalG.toFixed(2)}</span></div>
      </div>
      {ingresos.length > 0 && <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-gray-200 dark:border-gray-700"><span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">💰 Ingresos</span></div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">{ingresos.map(i => (<div key={i.id} className="px-5 py-3 flex justify-between"><span className="text-sm">{i.title}</span><span className="font-bold text-emerald-600">+€{(i.amount||0).toFixed(2)}</span></div>))}</div>
      </div>}
      {gastos.length > 0 && <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700"><span className="font-bold text-sm text-red-700 dark:text-red-400">💸 Gastos</span></div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">{gastos.map(g => (<div key={g.id} className="px-5 py-3 flex justify-between"><span className="text-sm">{g.title}</span><span className="font-bold text-red-500">-€{(g.amount||0).toFixed(2)}</span></div>))}</div>
      </div>}
    </div>
  );

  // ─── CURSOS ────────────────────────────────────────────────
  const CursosView = () => (
    <div className="space-y-3">
      <h3 className="font-bold text-lg dark:text-white">📚 Cursos ({cursos.length})</h3>
      {cursos.map(c => (
        <div key={c.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div><div className="font-semibold text-sm">{c.title}</div>{c.detail && <div className="text-xs text-gray-400 mt-1">{c.detail}</div>}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stColor(c.status)}`}>{c.status}</span>
        </div>
      ))}
    </div>
  );

  // ─── NAV ───────────────────────────────────────────────────
  const navItems = [
    { id: 'board' as const, icon: '📋', label: 'Pizarra' },
    { id: 'pisos' as const, icon: '🏠', label: 'Pisos', badge: pisos.length },
    { id: 'trabajos' as const, icon: '💼', label: 'Ofertas', badge: trabajos.length },
    { id: 'calendario' as const, icon: '📅', label: 'Calendario' },
    { id: 'finanzas' as const, icon: '💰', label: 'Finanzas' },
    { id: 'cursos' as const, icon: '📚', label: 'Cursos', badge: cursos.length },
  ];

  return (
    <div className="animate-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-2xl">🧠</span> LifeBot
          </h1>
          <div className="flex gap-1.5 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 font-bold">@arddiitibot</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 font-bold">@openclawfilehubbot</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-bold">Calendar</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <button onClick={loadAll} disabled={loading} className="w-9 h-9 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="text-sm">↻</span>}
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {navItems.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)} className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${section === n.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <span>{n.icon}</span><span>{n.label}</span>
            {(n.badge ?? 0) > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-0.5 ${section === n.id ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'}`}>{n.badge}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>}
      {!loading && section === 'board' && <Board />}
      {!loading && section === 'pisos' && <PisosView />}
      {!loading && section === 'trabajos' && <TrabajosView />}
      {!loading && section === 'calendario' && <CalView />}
      {!loading && section === 'finanzas' && <FinView />}
      {!loading && section === 'cursos' && <CursosView />}
    </div>
  );
};

export default Dashboard;
