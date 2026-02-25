import React from 'react';

interface Props {
  [key: string]: any;
}

const ProjectManager: React.FC<Props> = (props) => {
  return (
    <div className="animate-in">
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">📦</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Project Manager</h2>
        <p className="text-sm text-slate-400 mt-2">Módulo en desarrollo — conecta Supabase para datos reales</p>
      </div>
    </div>
  );
};

export default ProjectManager;
