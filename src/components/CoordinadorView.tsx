import React from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }

const CoordinadorView: React.FC<Props> = (props) => {
  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🗂️</span>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Coordinador</h2>
          <p className="text-xs text-slate-400">Cuaderno IA activo · Groq LLaMA 3.3</p>
        </div>
      </div>
      <NotebookAI
        sectionName="Coordinador"
        icon="🗂️"
        accentColor="#a855f7"
        sectionContext="El usuario está en la sección 'Coordinador' de su app personal FILEHUB."
      />
    </div>
  );
};

export default CoordinadorView;
