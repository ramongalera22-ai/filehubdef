import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, RefreshCw, ExternalLink, Wifi, WifiOff } from 'lucide-react';

const SB_URL = 'https://ztigttazrdzkpxrzyast.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aWd0dGF6cmR6a3B4cnp5YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTg5MzcsImV4cCI6MjA4NzU5NDkzN30.d-PQ0S_dXsTRXGdRrZDJiJOXcXFF4hEOaAGWpT3WaSM';
const TG_BOT = '8466601397:AAG4Ky7-mziSPUQbHtE6G9iyg_Gpc70WLVU';
const TG_CID = '596831448';

interface WaMsg {
  id: string;
  direction: 'in' | 'out';
  text: string;
  created_at: string;
}

const QUICK = [
  { label: '📋 Resumen', text: 'Resumen del día' },
  { label: '🚨 Guardia', text: '¿Cuándo es mi próxima guardia?' },
  { label: '💰 Balance', text: 'Balance financiero' },
  { label: '🏠 Pisos', text: 'busca pisos en alquiler en barcelona máximo 900€' },
  { label: '💼 Trabajo', text: 'busca trabajo medicina interna barcelona' },
  { label: '📅 Hoy', text: '¿Qué tengo hoy?' },
];

export default function WhatsAppView() {
  const [msgs, setMsgs] = useState<WaMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [relayOk, setRelayOk] = useState<boolean | null>(null);
  const [lastSeen, setLastSeen] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTsRef = useRef('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Load last 50 messages on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `${SB_URL}/rest/v1/wa_messages?select=*&order=created_at.asc&limit=50`,
          { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
        );
        if (r.ok) {
          const rows: WaMsg[] = await r.json();
          setMsgs(rows);
          if (rows.length) {
            lastTsRef.current = rows[rows.length - 1].created_at;
            setRelayOk(true);
            setLastSeen(fmtTime(rows[rows.length - 1].created_at));
          }
        }
      } catch {}
    })();
  }, []);

  // Poll Supabase every 3s for new messages
  useEffect(() => {
    const tick = async () => {
      try {
        const qs = lastTsRef.current
          ? `&created_at=gt.${encodeURIComponent(lastTsRef.current)}`
          : '&limit=0';
        const r = await fetch(
          `${SB_URL}/rest/v1/wa_messages?select=*&order=created_at.asc${qs}`,
          { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
        );
        if (r.ok) {
          const rows: WaMsg[] = await r.json();
          if (rows.length) {
            setMsgs(prev => [...prev, ...rows]);
            lastTsRef.current = rows[rows.length - 1].created_at;
            setRelayOk(true);
            setLastSeen(fmtTime(rows[rows.length - 1].created_at));
          }
        }
      } catch {}
    };
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t) return;
    setInput('');
    setSending(true);
    if (taRef.current) taRef.current.style.height = 'auto';

    // Optimistic UI
    const tmp: WaMsg = { id: 'tmp-' + Date.now(), direction: 'in', text: t, created_at: new Date().toISOString() };
    setMsgs(prev => [...prev, tmp]);

    try {
      await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CID, text: '📱 ' + t, parse_mode: 'HTML' }),
      });
    } catch {}
    setSending(false);
  }

  const relayStatus = relayOk === null ? 'connecting' : relayOk ? 'ok' : 'offline';

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ background: 'linear-gradient(135deg,#075e54,#128c7e)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)', boxShadow: '0 0 12px rgba(37,211,102,.4)' }}>
          🦞
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">OpenClaw · WhatsApp</div>
          <div className="text-xs text-white/60 font-mono truncate">@arddiitibot · Kimi K2.5 · via NucBox relay</div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold border ${
          relayStatus === 'ok'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : relayStatus === 'offline'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-slate-700/50 border-slate-600 text-slate-400'
        }`}>
          {relayStatus === 'ok' ? <Wifi size={11} /> : <WifiOff size={11} />}
          {relayStatus === 'ok' ? 'RELAY ACTIVO' : relayStatus === 'offline' ? 'OFFLINE' : '...'}
          {lastSeen && <span className="text-white/30 ml-1">{lastSeen}</span>}
        </div>
        <a href="https://filehubdef.vercel.app/dashboard.html" target="_blank" rel="noreferrer"
          className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
          <ExternalLink size={15} />
        </a>
      </div>

      {/* Relay bar */}
      <div className={`flex items-center gap-2 px-4 py-2 text-xs font-mono border-b ${
        relayStatus === 'ok'
          ? 'bg-green-500/5 border-green-500/10 text-green-400/80'
          : 'bg-amber-500/5 border-amber-500/10 text-amber-400/70'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${relayStatus === 'ok' ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
        {relayStatus === 'ok'
          ? 'Relay activo · Mensajes sincronizados en tiempo real desde NucBox'
          : 'Relay en espera · Ejecuta: node ~/whatsapp-relay.js en NucBox'}
      </div>

      {/* Quick buttons */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto flex-shrink-0 border-b border-green-500/10"
        style={{ scrollbarWidth: 'none' }}>
        {QUICK.map(q => (
          <button key={q.text} onClick={() => send(q.text)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-green-500/20 bg-green-500/5 text-green-400/80 hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-400">
            {q.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        style={{
          background: 'repeating-linear-gradient(0deg,transparent,transparent 29px,rgba(255,255,255,.012) 30px)',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(37,211,102,.2) transparent'
        }}>
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-500">
            <MessageCircle size={40} className="opacity-20" />
            <p className="text-sm font-medium">Sin mensajes aún</p>
            <p className="text-xs font-mono">Escríbete por WhatsApp o usa un botón rápido</p>
          </div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.direction === 'in' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.direction === 'in'
                ? 'rounded-tl-sm border-l-2 border-green-500'
                : 'rounded-tr-sm border-r-2 border-green-400'
            }`}
              style={{
                background: m.direction === 'in' ? '#1f2c34' : '#005c4b',
              }}>
              <div className="text-[10px] font-bold font-mono mb-1"
                style={{ color: '#25d366' }}>
                {m.direction === 'in' ? '👤 Tú' : '🦞 OpenClaw'}
              </div>
              <div className="text-slate-200 whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: m.text
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1 rounded text-[11px]">$1</code>') }} />
              <div className="text-[10px] mt-1.5 text-right font-mono flex items-center justify-end gap-1"
                style={{ color: 'rgba(255,255,255,.3)' }}>
                {fmtTime(m.created_at)}
                {m.direction === 'in' && <span style={{ color: '#25d366' }}>✓✓</span>}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t flex items-end gap-3"
        style={{ background: '#0d1520', borderColor: 'rgba(37,211,102,.15)' }}>
        <textarea
          ref={taRef}
          value={input}
          onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Enviar mensaje a OpenClaw por WhatsApp..."
          rows={1}
          className="flex-1 rounded-2xl px-4 py-2.5 text-sm resize-none outline-none text-slate-200 placeholder-slate-600 min-h-[42px] max-h-[100px]"
          style={{ background: '#1f2c34', border: '1px solid rgba(37,211,102,.2)' }}
        />
        <button
          onClick={() => send()}
          disabled={sending || !input.trim()}
          className="w-11 h-11 rounded-full flex items-center justify-center text-black font-bold text-lg flex-shrink-0 transition-all disabled:opacity-30"
          style={{ background: '#25d366', boxShadow: sending ? 'none' : '0 2px 10px rgba(37,211,102,.35)' }}>
          {sending ? <RefreshCw size={16} className="animate-spin" /> : '➤'}
        </button>
      </div>
    </div>
  );
}
