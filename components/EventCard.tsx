
import React from 'react';
import { Event } from '../types';
import { CalendarIcon } from './icons';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <div className="p-6">
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{event.title}</h3>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${event.type === 'Online' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}`}>
                    {event.type}
                </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{event.description}</p>
            
            <div className="mt-4 flex items-center text-sm text-slate-500 dark:text-slate-400">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span>{event.startDate} {event.endDate && `- ${event.endDate}`}</span>
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Location: {event.location}
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Host: {event.host.name}
            </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
            <button className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                RSVP
            </button>
        </div>
    </div>
  );
};
