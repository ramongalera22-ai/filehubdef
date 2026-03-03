import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

interface DataItem { id: string; type: string; title: string; detail?: string; status?: string; day?: number; amount?: number; created_at: string; }
interface Piso { id: string; title: string; detail?: string; status: string; created_at: string; }
interface Trabajo { id: string; title: string; detail?: string; status: string; created_at: string; }
interface CalEvent { summary: string; start: { dateTime?: string; date?: string }; }

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

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const stColor = (s?: string) => {
  if (s === 'completado') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  if (s === 'activo') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
  if (s === 'nuevo') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
};

const Dashboard: React.FC = () => {
  const [guardias, setGuardias] = useState<DataItem[]>([]);
  const [cursos, setCursos] = useState<DataItem[]>([]);
  const [objetivos, setObjetivos] = useState<DataItem[]>([]);
  const [tareas, setTareas] = useState<DataItem[]>([]);
  const [gastos, setGastos] = useState<DataItem[]>([]);
  const [ingresos, setIngresos] = useState<DataItem[]>([]);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [tab, setTab] = useState<'resumen' | 'pisos' | 'trabajos' | 'calendario' | 'finanzas'>('resumen');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes, tRes, cal] = await Promise.all([
        supabase.from('lifebot_data').select('*').order('created_at', { ascending: false }),
        supabase.from('lifebot_pisos').select('*').order('created_at', { ascending: false }),
        supabase.from('lifebot_trabajos').select('*').order('created_at', { ascending: false }),
        fetchCalendar(7)
      ]);
      const data: DataItem[] = dRes.data || [];
      setGuardias(data.filter(d => d.type === 'guardia'));
      setCursos(data.filter(d => d.type === 'curso'));
      setObjetivos(data.filter(d => d.type === 'objetivo'));
      setTareas(data.filter(d => d.type === 'tarea'));
      setGastos(data.filter(d => d.type === 'gasto'));
      setIngresos(data.filter(d => d.type === 'ingreso'));
      setPisos(pRes.data || []);
      setTrabajos(tRes.data || []);
      setCalEvents(cal);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const iv = setInterval(loadAll, 60000); return () => clearInterval(iv); }, [loadAll]);

  const totalG = gastos.reduce((s, g) => s + (g.amount || 0), 0);
  const totalI = ingresos.reduce((s, i) => s + (i.amount || 0), 0);
  const bal = totalI - totalG;

  const Stat = ({ icon, label, val, sub, bg }: { icon: string; label: string; val: string | number; sub?: string; bg: string }) => (
    <div className={`rounded-2xl p-4 ${bg} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-1"><span className="text-lg">{icon}</span><span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span></div>
      <div className="text-2xl font-black">{val}</div>
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  );

  const CalList = ({ events, max }: { events: CalEvent[]; max: number }) => (
    <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
      {events.length === 0 ? <div className="p-4 text-center text-sm text-gray-400">Sin eventos</div> :
        events.slice(0, max).map((ev, i) => {
          const dt = ev.start?.dateTime || ev.start?.date || '';
          return (
            <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="text-center min-w-[48px]">
                <div className="text-xs font-bold text-gray-500">{fmtDate(dt)}</div>
                <div className="text-xs text-gray-400">{!ev.start?.dateTime ? 'Día' : fmtTime(dt)}</div>
              </div>
              <div className="w-0.5 h-8 rounded bg-indigo-400" />
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{ev.summary || 'Sin título'}</div>
            </div>
          );
        })}
    </div>
  );

  const Section = ({ title, icon, headerBg, children }: { title: string; icon?: string; headerBg?: string; children: React.ReactNode }) => (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`px-5 py-3 border-b border-gray-200 dark:border-gray-700 ${headerBg || 'bg-gray-50 dark:bg-gray-800/80'}`}>
        <span className="font-bold text-sm">{icon} {title}</span>
      </div>
      {children}
    </div>
  );

  const tabs = [
    { id: 'resumen' as const, label: 'Resumen', icon: '📋' },
    { id: 'pisos' as const, label: 'Pisos', icon: '🏠', badge: pisos.length },
    { id: 'trabajos' as const, label: 'Ofertas', icon: '💼', badge: trabajos.length },
    { id: 'calendario' as const, label: 'Calendario', icon: '📅' },
    { id: 'finanzas' as const, label: 'Finanzas', icon: '💰' },
  ];

  return (
    <div className="animate-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">LifeBot Dashboard</h1>
          <p className="text-xs text-gray-400 mt-1">Auto-refresh 60s • {lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={loadAll} disabled={loading} className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors disabled:opacity-50">
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {/* Sources */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold">🤖 @arddiitibot</span>
        <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold">🦞 @openclawfilehubbot</span>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold">📅 Calendar (Maton)</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === t.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
            {(t.badge ?? 0) > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>}

      {!loading && tab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat icon="🚨" label="Guardias" val={guardias.length} bg="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" />
            <Stat icon="📚" label="Cursos" val={cursos.length} sub={`${cursos.filter(c => c.status === 'activo').length} activos`} bg="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300" />
            <Stat icon="🎯" label="Objetivos" val={`${objetivos.filter(o => o.status === 'completado').length}/${objetivos.length}`} bg="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" />
            <Stat icon="🏠" label="Pisos" val={pisos.length} sub={`${pisos.filter(p => p.status === 'nuevo').length} nuevos`} bg="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" />
            <Stat icon="💼" label="Ofertas" val={trabajos.length} sub={`${trabajos.filter(t => t.status === 'nuevo').length} nuevas`} bg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" />
          </div>

          <div className={`rounded-2xl p-5 ${bal >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-60">Balance</div>
                <div className={`text-3xl font-black ${bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{bal >= 0 ? '+' : ''}€{bal.toFixed(2)}</div>
              </div>
              <div className="text-right text-sm opacity-70">
                <div>+€{totalI.toFixed(2)}</div><div>-€{totalG.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <Section title={`Google Calendar — 7 días (${calEvents.length})`} icon="📅"><CalList events={calEvents} max={10} /></Section>

          {tareas.length > 0 && (
            <Section title={`Tareas (${tareas.filter(t => t.status !== 'completado').length} pendientes)`} icon="📌">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {tareas.slice(0, 8).map(t => (
                  <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                    <span>{t.status === 'completado' ? '✅' : '⬜'}</span>
                    <span className={`text-sm flex-1 ${t.status === 'completado' ? 'line-through opacity-50' : ''}`}>{t.title}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {guardias.length > 0 && (
            <Section title="Guardias" icon="🚨" headerBg="bg-red-50 dark:bg-red-900/20">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {guardias.map(g => (
                  <div key={g.id} className="px-5 py-3 flex items-center justify-between">
                    <div><span className="text-sm font-semibold">{g.title}</span>{g.detail && <span className="text-xs text-gray-400 ml-2">{g.detail}</span>}</div>
                    {g.day && <span className="text-xs font-mono bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded">D{g.day}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {cursos.length > 0 && (
            <Section title="Cursos" icon="📚" headerBg="bg-purple-50 dark:bg-purple-900/20">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {cursos.map(c => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                    <span className="text-sm">{c.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stColor(c.status)}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {!loading && tab === 'pisos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg dark:text-white">🏠 Pisos ({pisos.length})</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold">{pisos.filter(p => p.status === 'nuevo').length} nuevos</span>
          </div>
          {pisos.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">🏠</span><p className="text-sm">Sin pisos. El scraper los añade automáticamente.</p><p className="text-xs mt-1 opacity-60">/piso Título — Detalles</p></div>
          ) : pisos.map(p => (
            <div key={p.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.title}</div>
                  {p.detail && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{p.detail}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${stColor(p.status)}`}>{p.status}</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">{fmtDate(p.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'trabajos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg dark:text-white">💼 Ofertas ({trabajos.length})</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold">{trabajos.filter(t => t.status === 'nuevo').length} nuevas</span>
          </div>
          {trabajos.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">💼</span><p className="text-sm">Sin ofertas. OpenClaw busca CAMFIC automáticamente.</p><p className="text-xs mt-1 opacity-60">/trabajo Título — Detalles</p></div>
          ) : trabajos.map(t => (
            <div key={t.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{t.title}</div>
                  {t.detail && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{t.detail}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${stColor(t.status)}`}>{t.status}</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">{fmtDate(t.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'calendario' && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <iframe src="https://calendar.google.com/calendar/embed?src=ramongalera22%40gmail.com&ctz=Europe%2FMadrid" style={{ border: 0 }} width="100%" height="500" frameBorder="0" scrolling="no" title="Calendar" />
          </div>
          <Section title={`Eventos Maton API (${calEvents.length})`} icon="📅"><CalList events={calEvents} max={20} /></Section>
        </div>
      )}

      {!loading && tab === 'finanzas' && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 ${bal >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Balance total</div>
            <div className={`text-4xl font-black ${bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>€{bal.toFixed(2)}</div>
            <div className="flex gap-6 mt-3 text-sm"><span className="text-emerald-600">+€{totalI.toFixed(2)}</span><span className="text-red-500">-€{totalG.toFixed(2)}</span></div>
          </div>
          {ingresos.length > 0 && (
            <Section title="Ingresos" icon="💰" headerBg="bg-emerald-50 dark:bg-emerald-900/20">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {ingresos.map(i => (<div key={i.id} className="px-5 py-3 flex justify-between"><span className="text-sm">{i.title}</span><span className="font-bold text-emerald-600">+€{(i.amount || 0).toFixed(2)}</span></div>))}
              </div>
            </Section>
          )}
          {gastos.length > 0 && (
            <Section title="Gastos" icon="💸" headerBg="bg-red-50 dark:bg-red-900/20">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {gastos.map(g => (<div key={g.id} className="px-5 py-3 flex justify-between"><span className="text-sm">{g.title}</span><span className="font-bold text-red-500">-€{(g.amount || 0).toFixed(2)}</span></div>))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
