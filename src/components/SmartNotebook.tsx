import React, { useState, useRef, useCallback } from 'react';
import { BookOpen, Upload, X, Send, FileText, Trash2, ChevronDown, ChevronUp, Sparkles, Bot, User, Loader2, Plus, File, Image, FileSpreadsheet } from 'lucide-react';

// ============================================
// SMART NOTEBOOK — NotebookLM-style AI Notebook
// Uses Groq API for fast inference
// ============================================

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  content: string;
  size: number;
  addedAt: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SmartNotebookProps {
  section: string;
  sectionLabel: string;
  onClose: () => void;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  'pdf': <FileText size={16} className="text-red-400" />,
  'txt': <FileText size={16} className="text-blue-400" />,
  'csv': <FileSpreadsheet size={16} className="text-green-400" />,
  'md': <FileText size={16} className="text-purple-400" />,
  'json': <FileText size={16} className="text-yellow-400" />,
  'image': <Image size={16} className="text-pink-400" />,
  'default': <File size={16} className="text-slate-400" />,
};

function getFileIcon(type: string): React.ReactNode {
  if (type.includes('pdf')) return FILE_ICONS['pdf'];
  if (type.includes('csv') || type.includes('spreadsheet') || type.includes('excel')) return FILE_ICONS['csv'];
  if (type.includes('image')) return FILE_ICONS['image'];
  if (type.includes('json')) return FILE_ICONS['json'];
  if (type.includes('markdown') || type.includes('md')) return FILE_ICONS['md'];
  if (type.includes('text')) return FILE_ICONS['txt'];
  return FILE_ICONS['default'];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function readFileAsText(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    
    if (file.type.includes('image')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
}

async function callGroq(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || 'Sin respuesta';
}

const SECTION_CONTEXTS: Record<string, string> = {
  'dashboard': 'panel principal y resumen general de productividad personal',
  'expenses': 'gastos, finanzas personales, presupuestos y control de deudas',
  'shared-finances': 'gastos compartidos, cuentas entre amigos/pareja',
  'monthly-analysis': 'análisis mensual de gastos e ingresos',
  'tasks': 'tareas, to-do lists y gestión del tiempo',
  'goals': 'metas personales, objetivos y seguimiento de progreso',
  'calendar': 'calendario, eventos y planificación',
  'fitness': 'entrenamiento, ejercicio físico y rutinas de gym',
  'nutrition': 'nutrición, dietas, planes alimenticios y calorías',
  'trips': 'viajes, planificación de expediciones y presupuestos de viaje',
  'shopping': 'compras, listas de compras y pedidos online',
  'work': 'proyectos de trabajo, gestión de proyectos profesionales',
  'ideas': 'ideas, brainstorming y creatividad',
  'files': 'archivos y documentos subidos',
  'courses': 'aprendizaje, cursos y formación continua',
  'ai-hub': 'herramientas de inteligencia artificial',
  'news': 'noticias y actualidad',
  'settings': 'configuración y ajustes de la aplicación',
};

const SmartNotebook: React.FC<SmartNotebookProps> = ({ section, sectionLabel, onClose }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFiles, setShowFiles] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const handleFileUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const content = await readFileAsText(file);
        newFiles.push({
          id: Date.now().toString() + '_' + i,
          name: file.name,
          type: file.type || 'text/plain',
          content: content.substring(0, 50000), // Limit to ~50K chars
          size: file.size,
          addedAt: new Date(),
        });
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    
    if (newFiles.length > 0) {
      const fileNames = newFiles.map(f => f.name).join(', ');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📎 ${newFiles.length > 1 ? 'Archivos añadidos' : 'Archivo añadido'}: **${fileNames}**\n\nYa puedo responder preguntas sobre ${newFiles.length > 1 ? 'estos archivos' : 'este archivo'}. ¿Qué quieres saber?`,
        timestamp: new Date(),
      }]);
      scrollToBottom();
    }
  }, [scrollToBottom]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const sectionContext = SECTION_CONTEXTS[section] || section;
      
      // Build context from uploaded files
      let filesContext = '';
      if (files.length > 0) {
        filesContext = '\n\n--- DOCUMENTOS DEL USUARIO ---\n';
        files.forEach((f, i) => {
          const preview = f.type.includes('image') 
            ? `[Imagen: ${f.name}]`
            : f.content.substring(0, 15000);
          filesContext += `\n📄 Documento ${i + 1}: "${f.name}" (${f.type})\n${preview}\n---\n`;
        });
      }

      const systemPrompt = `Eres un asistente de cuaderno digital inteligente integrado en FILEHUB, especializado en la sección de "${sectionLabel}" (${sectionContext}).

Tu rol es ayudar al usuario a analizar, resumir, buscar información y responder preguntas sobre los documentos que ha subido a este cuaderno.

Comportamiento:
- Responde SIEMPRE en español
- Sé conciso pero completo
- Si el usuario pregunta sobre algo que está en los documentos, cita la información relevante
- Si no hay documentos subidos, puedes ayudar con conocimiento general sobre ${sectionContext}
- Usa formato markdown cuando sea útil (negritas, listas, etc.)
- Si el usuario pide un resumen, hazlo estructurado y claro
- Si el usuario pide análisis, sé detallado y ofrece insights
${filesContext}`;

      const chatHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: userMsg.content },
      ];

      const response = await callGroq(groqMessages);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, files, messages, section, sectionLabel, scrollToBottom]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const suggestedQuestions = files.length > 0
    ? ['Resume los documentos', 'Puntos clave', 'Busca datos importantes', 'Compara los documentos']
    : ['¿Qué puedo hacer aquí?', `Consejos sobre ${sectionLabel.toLowerCase()}`, 'Ayúdame a organizarme'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">Cuaderno IA — {sectionLabel}</h2>
              <p className="text-[10px] text-white/70">{files.length} documento{files.length !== 1 ? 's' : ''} · Groq LLaMA 3.3</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Files sidebar */}
          <div className={`${showFiles ? 'w-64' : 'w-0'} transition-all duration-200 border-r border-slate-100 dark:border-slate-800 overflow-hidden flex-shrink-0`}>
            <div className="w-64 h-full flex flex-col">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fuentes</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 flex items-center justify-center transition-colors"
                >
                  <Plus size={14} className="text-indigo-500" />
                </button>
              </div>

              {/* Drop zone */}
              <div
                className={`mx-3 mb-3 p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={20} className={`mx-auto mb-1.5 ${dragActive ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`} />
                <p className="text-[10px] font-semibold text-slate-400">
                  Arrastra archivos o haz clic
                </p>
                <p className="text-[9px] text-slate-300 dark:text-slate-600 mt-0.5">
                  PDF, TXT, CSV, MD, JSON
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.csv,.md,.json,.html,.xml,.log,.js,.ts,.py,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              {/* File list */}
              <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                      <p className="text-[9px] text-slate-400">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={11} className="text-red-400" />
                    </button>
                  </div>
                ))}
                {files.length === 0 && (
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 text-center py-6">
                    Sin documentos aún
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Toggle files button */}
            <button
              onClick={() => setShowFiles(!showFiles)}
              className="self-start mx-3 mt-2 px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
            >
              {showFiles ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
              {showFiles ? 'Ocultar fuentes' : 'Mostrar fuentes'}
            </button>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <Sparkles size={28} className="text-indigo-500" />
                  </div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">
                    Cuaderno IA — {sectionLabel}
                  </h3>
                  <p className="text-xs text-slate-400 mb-6 max-w-sm">
                    Sube documentos y pregúntame sobre ellos. Puedo resumir, analizar, buscar datos y responder preguntas.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-md'
                  }`}>
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-black/10 rounded text-[11px]">$1</code>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={14} className="text-slate-500 dark:text-slate-400" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="text-indigo-500 animate-spin" />
                      <span className="text-xs text-slate-400">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2">
              <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-400 transition-colors">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center flex-shrink-0 transition-colors mb-0.5"
                >
                  <Upload size={16} className="text-slate-400" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={files.length > 0 ? 'Pregunta sobre tus documentos...' : 'Escribe una pregunta...'}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none resize-none max-h-32 py-1.5"
                  style={{ minHeight: '36px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all mb-0.5 ${
                    input.trim() && !loading
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-300 dark:text-slate-600 mt-1.5">
                Groq LLaMA 3.3 70B · Los archivos se procesan localmente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartNotebook;
