// ═══════════════════════════════════════════════
// NotebookAI — Cuaderno IA reutilizable con Groq
// Se embebe en cualquier sección de la app
// ═══════════════════════════════════════════════
import React, { useState, useRef, useCallback } from 'react';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface Message { role: 'user' | 'assistant'; content: string; }
interface Note { id: string; title: string; content: string; createdAt: string; }

interface Props {
  sectionName: string;       // e.g. "Gastos y Deuda"
  sectionContext?: string;   // datos extra para dar contexto al modelo
  accentColor?: string;      // color del botón y bordes
  icon?: string;             // emoji del módulo
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

const NotebookAI: React.FC<Props> = ({
  sectionName,
  sectionContext = '',
  accentColor = '#6366f1',
  icon = '📓',
}) => {
  const [tab, setTab] = useState<'chat' | 'notas' | 'docs'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; text: string }[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const systemPrompt = `Eres un asistente IA especializado en "${sectionName}" dentro de la app FILEHUB.
Responde siempre en español, de forma clara, útil y concisa. Usa emojis con moderación.
${sectionContext ? `\nContexto del usuario:\n${sectionContext}` : ''}
${uploadedDocs.length > 0 ? `\nDocumentos subidos por el usuario:\n${uploadedDocs.map(d => `[${d.name}]: ${d.text.slice(0, 2000)}`).join('\n\n')}` : ''}`;

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...newMsgs,
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });
      if (!res.ok) throw new Error(`Groq error: ${res.status}`);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Sin respuesta';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      title: noteTitle || 'Sin título',
      content: noteContent,
      createdAt: new Date().toLocaleDateString('es-ES'),
    };
    setNotes(prev => [note, ...prev]);
    setNoteTitle('');
    setNoteContent('');
  };

  const askAboutNote = (note: Note) => {
    setTab('chat');
    setInput(`Resume y analiza esta nota: "${note.title}"\n${note.content}`);
  };

  const handleFile = useCallback(async (file: File) => {
    setDocLoading(true);
    setDocError('');
    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        const text = await file.text();
        setUploadedDocs(prev => [...prev, { name: file.name, text }]);
      } else if (file.type === 'application/pdf') {
        // Para PDFs, usamos Claude Haiku (ya configurado en el proyecto)
        const base64 = await fileToBase64(file);
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            system: 'Extrae todo el texto de este documento de forma estructurada. Devuelve solo el texto extraído, sin comentarios adicionales.',
            messages: [{
              role: 'user',
              content: [
                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
                { type: 'text', text: 'Extrae todo el texto de este documento.' },
              ],
            }],
          }),
        });
        const data = await res.json();
        const text = data.content?.map((b: any) => b.text || '').join('') || '';
        setUploadedDocs(prev => [...prev, { name: file.name, text }]);
      } else {
        setDocError('Formato no soportado. Usa PDF, TXT, CSV o MD.');
        return;
      }
      setTab('chat');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Documento "${file.name}" cargado correctamente. Ya puedes preguntarme sobre su contenido.`,
      }]);
    } catch (e: any) {
      setDocError(`Error al procesar: ${e.message}`);
    } finally {
      setDocLoading(false);
    }
  }, []);

  const s = {
    tab: (t: string) => ({
      padding: '6px 12px',
      borderRadius: '8px 8px 0 0',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 600,
      background: tab === t ? '#1e293b' : 'transparent',
      color: tab === t ? accentColor : '#64748b',
      borderBottom: tab === t ? `2px solid ${accentColor}` : '2px solid transparent',
    } as React.CSSProperties),
    btn: {
      padding: '8px 16px', borderRadius: 8, border: 'none',
      background: accentColor, color: 'white', cursor: 'pointer',
      fontSize: 13, fontWeight: 600,
    } as React.CSSProperties,
    input: {
      width: '100%', padding: '10px 14px', borderRadius: 10,
      border: '1px solid #334155', background: '#0f172a',
      color: '#e2e8f0', fontSize: 13, outline: 'none',
      boxSizing: 'border-box',
    } as React.CSSProperties,
  };

  return (
    <div style={{ background: '#0f172a', borderRadius: 14, border: '1px solid #1e293b', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 0', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>Cuaderno IA — {sectionName}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Groq LLaMA 3.3 70B · {uploadedDocs.length} doc{uploadedDocs.length !== 1 ? 's' : ''} cargados</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {[['chat', '💬 Chat'], ['notas', '📝 Notas'], ['docs', '📎 Docs']].map(([t, l]) => (
            <button key={t} style={s.tab(t)} onClick={() => setTab(t as any)}>{l}</button>
          ))}
        </div>
      </div>

      {/* CHAT */}
      {tab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 380 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#475569', marginTop: 30 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
                <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>Pregúntame sobre {sectionName}</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Puedes subir documentos en la pestaña Docs</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? accentColor : '#1e293b',
                  border: m.role === 'assistant' ? '1px solid #334155' : 'none',
                  fontSize: 13, lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap',
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ padding: '9px 13px', background: '#1e293b', borderRadius: '16px 16px 16px 4px', border: '1px solid #334155', width: 56, display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor, animation: `nb-bounce 1s ${i*0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid #1e293b', display: 'flex', gap: 8 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`Pregunta sobre ${sectionName}...`}
              style={{ ...s.input, flex: 1, borderRadius: 24, padding: '9px 16px' }}
            />
            <button onClick={sendMessage} disabled={loading}
              style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: loading ? '#334155' : accentColor, color: 'white', cursor: loading ? 'default' : 'pointer', fontSize: 15 }}>→</button>
          </div>
        </div>
      )}

      {/* NOTAS */}
      {tab === 'notas' && (
        <div style={{ padding: 14, height: 380, overflowY: 'auto' }}>
          <div style={{ marginBottom: 14 }}>
            <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Título de la nota..." style={{ ...s.input, marginBottom: 8 }} />
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Escribe tu nota aquí..."
              style={{ ...s.input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={s.btn} onClick={saveNote}>💾 Guardar nota</button>
              {noteContent && <button onClick={() => { saveNote(); setTab('chat'); setInput(`Analiza esta nota: "${noteTitle}"\n${noteContent}`); }}
                style={{ ...s.btn, background: '#334155' }}>🤖 Guardar y preguntar a IA</button>}
            </div>
          </div>
          {notes.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', marginTop: 20, fontSize: 13 }}>No hay notas todavía</div>
          ) : (
            notes.map(note => (
              <div key={note.id} style={{ background: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{note.title}</span>
                  <span style={{ fontSize: 10, color: '#475569' }}>{note.createdAt}</span>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 8px', lineHeight: 1.5 }}>{note.content.slice(0, 150)}{note.content.length > 150 ? '...' : ''}</p>
                <button onClick={() => askAboutNote(note)} style={{ fontSize: 11, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>🤖 Preguntar a IA →</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* DOCS */}
      {tab === 'docs' && (
        <div style={{ padding: 14, height: 380, overflowY: 'auto' }}>
          <div
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed #334155', borderRadius: 12, padding: '32px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 14 }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.txt,.csv,.md" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {docLoading ? (
              <><div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div><div style={{ color: '#94a3b8', fontSize: 13 }}>Procesando documento...</div></>
            ) : (
              <><div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
              <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Arrastra un archivo aquí</div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>PDF, TXT, CSV, MD</div></>
            )}
          </div>
          {docError && <div style={{ padding: '8px 12px', background: '#450a0a', borderRadius: 8, color: '#f87171', fontSize: 12, marginBottom: 12 }}>❌ {docError}</div>}
          {uploadedDocs.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span>📄</span>
                <div>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: '#3fb950' }}>✓ {d.text.length} caracteres extraídos</div>
                </div>
              </div>
              <button onClick={() => setUploadedDocs(prev => prev.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes nb-bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}`}</style>
    </div>
  );
};

export default NotebookAI;
