import React, { useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';

interface OmniAssistantProps {
  globalContext?: any;
  onAddExpenses?: (expenses: any[]) => void;
}

const OmniAssistant: React.FC<OmniAssistantProps> = ({ globalContext, onAddExpenses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform z-40"
      >
        {isOpen ? <X size={24} className="text-white" /> : <Sparkles size={24} className="text-white" />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-40 overflow-hidden animate-in">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-4">
            <h3 className="text-white font-bold text-sm">Asistente FILEHUB</h3>
            <p className="text-indigo-200 text-xs mt-0.5">Powered by AI</p>
          </div>
          <div className="h-64 p-4 overflow-y-auto">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300">
              ¡Hola! Soy tu asistente. Puedo ayudarte con gastos, tareas, metas y más. ¿En qué te ayudo?
            </div>
          </div>
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <button className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default OmniAssistant;
