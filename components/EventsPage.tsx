
import React from 'react';
import { MOCK_EVENTS } from '../constants';
import { EventCard } from './EventCard';

export const EventsPage: React.FC = () => {
  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Events & Courses</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Join workshops, study groups, and community gatherings.</p>

        <div className="mt-8 space-y-6">
          {MOCK_EVENTS.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
};
