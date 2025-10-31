
import React from 'react';
import { NAVIGATION_ITEMS } from '../constants';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  return (
    <aside className="hidden md:block w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4">
      <div className="font-bold text-xl mb-8 text-indigo-800 dark:text-indigo-300">
        Community
      </div>
      <nav className="space-y-2">
        {NAVIGATION_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              currentView === item.id
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};
