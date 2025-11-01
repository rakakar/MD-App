
import React from 'react';
import { User } from '../types';

interface ProfileCardProps {
  user: User;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user }) => {
  const locationString = [user.city, user.state, user.country].filter(Boolean).join(', ');
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 flex flex-col items-center text-center">
      <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full mb-4" />
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user.name}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{locationString}</p>
      <p className="mt-2 px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full dark:text-indigo-300 dark:bg-indigo-900">{user.studyLevel}</p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 flex-grow">{user.bio}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {user.interests.map(interest => (
          <span key={interest} className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-full dark:text-slate-400 dark:bg-slate-700">{interest}</span>
        ))}
      </div>
      <button className="mt-6 w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Connect
      </button>
    </div>
  );
};