import React from 'react';
import NotebookAI from './NotebookAI';

interface Props { [key: string]: any; }

const SharedFinancesView: React.FC<Props> = (props) => {
  return (
    <div className="animate-in p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">👥</span>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Cuentas Compartidas</h2>
          <p className="text-xs text-slate-400">Cuaderno IA activo · Groq LLaMA 3.3</p>
        </div>
      </div>
      <NotebookAI
        sectionName="Cuentas Compartidas"
        icon="👥"
        accentColor="#8b5cf6"
        sectionContext="El usuario está en la sección 'Cuentas Compartidas' de su app personal FILEHUB."
      />
    </div>
  );
};

export default SharedFinancesView;
