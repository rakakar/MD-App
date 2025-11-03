
import React from 'react';
import { NAVIGATION_ITEMS } from '../constants';
import { View, User } from '../types';

interface SidebarProps {
  currentUser: User;
  currentView: View;
  onNavigate: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, currentView, onNavigate }) => {
  return (
    <aside className="hidden md:block w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col">
      <div className="font-bold text-xl mb-6 text-indigo-800 dark:text-indigo-300">
        Community
      </div>
      <div 
        className="mb-6 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
        onClick={() => onNavigate(View.Profile)}
      >
        <div className="flex items-center">
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-10 h-10 rounded-full" />
            <div className="ml-3">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{currentUser.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">View Profile</p>
            </div>
        </div>
      </div>
      <nav className="space-y-2 flex-1">
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