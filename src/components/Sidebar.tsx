import React from 'react';
import type { ViewType } from '../types';
import {
  LayoutDashboard, DollarSign, CheckSquare, Target, Calendar, MapPin,
  ShoppingCart, Lightbulb, Dumbbell, Apple, Briefcase, Brain, QrCode,
  Settings, FolderOpen, Newspaper, Users, Zap, LogOut, ScanLine,
  BookOpen, Car, Globe, Stethoscope, BarChart2, MessageSquare
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onScanClick: () => void;
  onLogout: () => void;
}

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'calendar' as ViewType, label: 'Calendario', icon: Calendar },
      { id: 'tasks' as ViewType, label: 'Tareas', icon: CheckSquare },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { id: 'expenses' as ViewType, label: 'Gastos', icon: DollarSign },
      { id: 'shared-finances' as ViewType, label: 'Compartidos', icon: Users },
      { id: 'monthly-analysis' as ViewType, label: 'Análisis', icon: BarChart2 },
    ],
  },
  {
    label: 'Vida',
    items: [
      { id: 'goals' as ViewType, label: 'Metas', icon: Target },
      { id: 'fitness' as ViewType, label: 'Fitness', icon: Dumbbell },
      { id: 'nutrition' as ViewType, label: 'Nutrición', icon: Apple },
      { id: 'trips' as ViewType, label: 'Viajes', icon: MapPin },
      { id: 'shopping' as ViewType, label: 'Compras', icon: ShoppingCart },
    ],
  },
  {
    label: 'Trabajo',
    items: [
      { id: 'work' as ViewType, label: 'Proyectos', icon: Briefcase },
      { id: 'ideas' as ViewType, label: 'Ideas', icon: Lightbulb },
      { id: 'files' as ViewType, label: 'Archivos', icon: FolderOpen },
      { id: 'courses' as ViewType, label: 'Aprendizaje', icon: BookOpen },
    ],
  },
  {
    label: 'AI & Tools',
    items: [
      { id: 'ai-hub' as ViewType, label: 'AI Hub', icon: Brain },
      { id: 'news' as ViewType, label: 'Noticias', icon: Newspaper },
      { id: 'qr' as ViewType, label: 'QR', icon: QrCode },
      { id: 'settings' as ViewType, label: 'Ajustes', icon: Settings },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onScanClick, onLogout }) => {
  return (
    <div className="w-[260px] h-screen bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 flex flex-col overflow-y-auto custom-scrollbar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">FILEHUB</h1>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.15em]">v3.0 Cloud</p>
        </div>
      </div>

      {/* Scan button */}
      <div className="px-4 mb-4">
        <button
          onClick={onScanClick}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-bold text-xs hover:from-indigo-600 hover:to-indigo-700 transition-all"
        >
          <ScanLine size={16} />
          Escanear documento
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em] px-3 mb-1.5">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
