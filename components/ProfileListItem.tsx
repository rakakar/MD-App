import React from 'react';
import { User } from '../types';

interface ProfileListItemProps {
  user: User;
}

export const ProfileListItem: React.FC<ProfileListItemProps> = ({ user }) => {
  const locationString = [user.city, user.state, user.country].filter(Boolean).join(', ');
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center space-x-4">
      <img src={user.avatarUrl} alt={user.name} className="w-16 h-16 rounded-full" />
      <div className="flex-grow">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user.name}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{locationString}</p>
        <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full dark:text-indigo-300 dark:bg-indigo-900">{user.studyLevel}</span>
        </div>
      </div>
      <button className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Connect
      </button>
    </div>
  );
};