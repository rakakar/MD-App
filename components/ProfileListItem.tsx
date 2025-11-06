import React, { useMemo } from 'react';
import { User } from '../types';
import { MailIcon, PhoneIcon } from './icons';

interface ProfileListItemProps {
  user: User;
}

export const ProfileListItem: React.FC<ProfileListItemProps> = ({ user }) => {
  const locationString = [user.city, user.state, user.country].filter(Boolean).join(', ');

  const contactInfo = useMemo(() => {
    const bio = user.bio || '';
    const parts = bio.split(',').map(p => p.trim());
    const phonePart = parts.find(p => p.toLowerCase().startsWith('phone:'));
    const emailPart = parts.find(p => p.toLowerCase().startsWith('email:'));
    
    const phone = phonePart ? phonePart.substring(6).trim() : null;
    const email = emailPart ? emailPart.substring(6).trim() : null;
    
    return { phone, email };
  }, [user.bio]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center gap-4">
        {/* Section 1: Avatar, Name, Location */}
        <div className="flex items-center gap-4 md:flex-1">
            <img src={user.avatarUrl} alt={user.name} className="w-16 h-16 rounded-full flex-shrink-0" />
            <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{locationString}</p>
            </div>
        </div>

        {/* Section 2: Details (Level & Contact) */}
        <div className="flex flex-col items-start gap-2 md:flex-1">
            <div>
                <span className="px-2 py-0.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full dark:text-indigo-300 dark:bg-indigo-900">{user.studyLevel}</span>
            </div>
            {(contactInfo.phone || contactInfo.email) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                    {contactInfo.phone && (
                        <div className="flex items-center gap-1.5">
                            <PhoneIcon className="w-4 h-4 text-slate-400" />
                            <a href={`tel:${contactInfo.phone}`} className="hover:underline">{contactInfo.phone}</a>
                        </div>
                    )}
                    {contactInfo.email && (
                        <div className="flex items-center gap-1.5">
                            <MailIcon className="w-4 h-4 text-slate-400" />
                            <a href={`mailto:${contactInfo.email}`} className="hover:underline">{contactInfo.email}</a>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Section 3: Action Button */}
        <div className="flex justify-end md:justify-start">
            <button className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Connect
            </button>
        </div>
    </div>
  );
};