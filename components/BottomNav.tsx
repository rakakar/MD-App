
import React from 'react';
import { NAVIGATION_ITEMS } from '../constants';
import { View } from '../types';

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around">
      {NAVIGATION_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center justify-center p-2 w-full text-xs transition-colors ${
            currentView === item.id
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600'
          }`}
        >
          <item.icon className="w-6 h-6 mb-1" />
          {item.label}
        </button>
      ))}
    </nav>
  );
};
