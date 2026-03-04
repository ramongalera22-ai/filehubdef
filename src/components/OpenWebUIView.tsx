import React from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }

const OpenWebUIView: React.FC<Props> = (props) => {
  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🌍</span>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Open WebUI</h2>
          <p className="text-xs text-slate-400">Cuaderno IA activo · Groq LLaMA 3.3</p>
        </div>
      </div>
      <NotebookAI
        sectionName="Open WebUI"
        icon="🌍"
        accentColor="#3b82f6"
        sectionContext="El usuario está en la sección 'Open WebUI' de su app personal FILEHUB."
      />
    </div>
  );
};

export default OpenWebUIView;
