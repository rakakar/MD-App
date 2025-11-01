import React from 'react';
import { Event } from '../types';
import { CalendarIcon, MapPinIcon, UsersIcon, LanguagesIcon, ShareIcon } from './icons';

interface EventCardProps {
  event: Event;
}

const EventDetail: React.FC<{ icon: React.ElementType; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex items-center text-base text-slate-700 dark:text-slate-300">
    <Icon className="w-5 h-5 mr-3 flex-shrink-0 text-slate-500 dark:text-slate-400" />
    <span>{text}</span>
  </div>
);

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const formatDates = (start: string, end: string | undefined) => {
    // A simple check if the date is in DD/MM/YYYY format, otherwise return as is.
    const isFormatted = /^\d{2}\/\d{2}\/\d{4}$/.test(start);
    if (isFormatted) {
      if (end) {
        return `${start} - ${end}`;
      }
      return start;
    }
    // For old format like "October 15, 2024"
    if(end && end.trim() !== '') return `${start} - ${end}`;
    return start;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
      <div className="p-6 flex-grow">
        <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-3">{event.title}</h3>

        <div className="mb-6">
          <span className="inline-block bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2 rounded-full">
            {event.category}
          </span>
        </div>
        
        <div className="space-y-4">
          <EventDetail icon={CalendarIcon} text={formatDates(event.startDate, event.endDate)} />
          <EventDetail icon={MapPinIcon} text={event.location} />
          <EventDetail icon={UsersIcon} text={event.organizer} />
          <EventDetail icon={LanguagesIcon} text={event.language} />
        </div>
      </div>
      
      <div className="px-6 pt-4 pb-6 flex items-center gap-4 border-t border-slate-100 dark:border-slate-700">
        <button className="flex-grow px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          View Details
        </button>
        <button
          className="p-3 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Share event"
        >
          <ShareIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};