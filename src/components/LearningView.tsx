import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

interface Course {
  id: string;
  title: string;
  detail: string;
  status: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const LearningView: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newCourse, setNewCourse] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [loading, setLoading] = useState(true);

  const uid = () => String(Date.now()) + String(Math.floor(Math.random() * 1000));

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cRes, nRes] = await Promise.all([
      supabase.from('lifebot_data').select('*').eq('type', 'curso').order('created_at', { ascending: false }),
      supabase.from('lifebot_notes').select('*').eq('category', 'cur').order('created_at', { ascending: false })
    ]);
    if (cRes.data) setCourses(cRes.data);
    if (nRes.data) setNotes(nRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addCourse = async () => {
    if (!newCourse.trim()) return;
    const c = { id: uid(), type: 'curso', title: newCourse.trim(), detail: newDetail.trim(), status: 'pendiente', created_at: new Date().toISOString() };
    await supabase.from('lifebot_data').insert(c);
    setCourses(prev => [c, ...prev]);
    setNewCourse(''); setNewDetail('');
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'pendiente' ? 'activo' : current === 'activo' ? 'completado' : 'pendiente';
    await supabase.from('lifebot_data').update({ status: next }).eq('id', id);
    setCourses(prev => prev.map(c => c.id === id ? { ...c, status: next } : c));
  };

  const delCourse = async (id: string) => {
    await supabase.from('lifebot_data').delete().eq('id', id);
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const addNote = async () => {
    if (!noteTitle.trim()) return;
    const n = { id: uid(), category: 'cur', title: noteTitle.trim(), content: noteContent.trim(), created_at: new Date().toISOString() };
    await supabase.from('lifebot_notes').insert(n);
    setNotes(prev => [n, ...prev]);
    setNoteTitle(''); setNoteContent('');
  };

  const delNote = async (id: string) => {
    await supabase.from('lifebot_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const statusColors: Record<string, string> = {
    pendiente: 'bg-amber-500/20 text-amber-400',
    activo: 'bg-cyan-500/20 text-cyan-400',
    completado: 'bg-emerald-500/20 text-emerald-400'
  };

  const statusIcons: Record<string, string> = {
    pendiente: '⏳', activo: '📖', completado: '✅'
  };

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">📚</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Cursos & Formación</h2>
          <p className="text-xs text-slate-400">Sincronizado con Telegram · {courses.length} cursos · {notes.length} notas</p>
        </div>
        <button onClick={loadData} className="ml-auto text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">↻ Sync</button>
      </div>

      {/* Add Course */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="flex gap-2 mb-2">
          <input value={newCourse} onChange={e => setNewCourse(e.target.value)} placeholder="Nombre del curso..." className="flex-1 bg-slate-900/50 text-white text-sm px-3 py-2 rounded-lg border border-slate-600/50 focus:border-cyan-500/50 outline-none" onKeyDown={e => e.key === 'Enter' && addCourse()} />
          <button onClick={addCourse} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm px-4 py-2 rounded-lg transition-colors">+ Curso</button>
        </div>
        <input value={newDetail} onChange={e => setNewDetail(e.target.value)} placeholder="Detalles: lugar, duración, precio... (opcional)" className="w-full bg-slate-900/50 text-white text-sm px-3 py-2 rounded-lg border border-slate-600/50 focus:border-cyan-500/50 outline-none" onKeyDown={e => e.key === 'Enter' && addCourse()} />
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="text-center text-slate-400 py-8">Cargando...</div>
      ) : courses.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          <span className="text-3xl block mb-2">📚</span>
          Sin cursos. Añade uno arriba o desde Telegram:<br />
          <code className="text-xs text-cyan-400">/curso Ecografía — Sind.Médico — 10h</code>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map(c => (
            <div key={c.id} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 flex items-center gap-3 group hover:border-slate-600/50 transition-colors">
              <button onClick={() => toggleStatus(c.id, c.status)} className="text-xl hover:scale-110 transition-transform" title="Cambiar estado">
                {statusIcons[c.status] || '⏳'}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${c.status === 'completado' ? 'line-through text-slate-500' : 'text-white'}`}>{c.title}</div>
                {c.detail && <div className="text-xs text-slate-400 truncate">{c.detail}</div>}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColors[c.status] || statusColors.pendiente}`}>
                {c.status}
              </span>
              <button onClick={() => delCourse(c.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Notes Section */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-bold text-white mb-3">📝 Cuaderno de Cursos <span className="text-slate-400 font-normal">{notes.length} notas</span></h3>
        <div className="flex gap-2 mb-3">
          <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Título de la nota..." className="flex-1 bg-slate-900/50 text-white text-sm px-3 py-2 rounded-lg border border-slate-600/50 focus:border-purple-500/50 outline-none" />
          <button onClick={addNote} className="bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">+ Nota</button>
        </div>
        <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Apuntes, resúmenes, dudas..." rows={2} className="w-full bg-slate-900/50 text-white text-sm px-3 py-2 rounded-lg border border-slate-600/50 focus:border-purple-500/50 outline-none resize-none mb-3" />
        
        {notes.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notes.map(n => (
              <div key={n.id} className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{n.title}</div>
                    {n.content && <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{n.content}</div>}
                    <div className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleDateString('es-ES')}</div>
                  </div>
                  <button onClick={() => delNote(n.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningView;
