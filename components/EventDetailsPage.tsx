import React from 'react';
import { Event } from '../types';
import { ChevronLeftIcon, CalendarIcon, MapPinIcon, UsersIcon, LanguagesIcon, DownloadIcon, ShareIcon } from './icons';

interface EventDetailsPageProps {
  event: Event;
  onBack: () => void;
}

const EventDetailRow: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start">
        <Icon className="w-5 h-5 mr-4 mt-1 flex-shrink-0 text-slate-500 dark:text-slate-400" />
        <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="text-slate-600 dark:text-slate-400">{value}</p>
        </div>
    </div>
);

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({ event, onBack }) => {

  const formatDates = (start: string, end: string | undefined) => {
    const isFormatted = /^\d{2}\/\d{2}\/\d{4}$/.test(start);
    if (isFormatted) {
      if (end) return `${start} - ${end}`;
      return start;
    }
    if(end && end.trim() !== '') return `${start} - ${end}`;
    return start;
  };
  
  const handleShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: event.title,
                text: `Check out this event: ${event.title}. ${event.invitationNote || ''}`,
            });
        } catch (error) {
            console.log('Share was cancelled or failed', error);
        }
    } else {
        alert("Sharing is not supported on this browser.");
    }
  };

  return (
    <div className="h-full overflow-y-auto relative pb-24 bg-slate-50 dark:bg-slate-900">
      
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-700/80">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between h-16">
                <button onClick={onBack} className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                    <ChevronLeftIcon className="w-5 h-5 mr-1" />
                    <span className="hidden sm:inline">Back</span>
                </button>
                <h1 className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-slate-100 truncate px-2 sm:px-4">{event.title}</h1>
                {navigator.share ? (
                    <button
                        onClick={handleShare}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                        aria-label="Share event"
                    >
                        <ShareIcon className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="w-9 h-9 flex-shrink-0"></div> // Placeholder for alignment
                )}
            </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">{event.title}</h1>

        <div className="mt-6 md:mt-8">
            <div className="aspect-[3/4] md:max-w-sm mx-auto bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
                {event.posterUrl ? (
                    <img src={event.posterUrl} alt={`${event.title} poster`} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <span>Poster Coming Soon</span>
                    </div>
                )}
            </div>
            {event.posterUrl && (
                <div className="mt-4 text-center">
                    <a 
                        href={event.posterUrl} 
                        download 
                        className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                    >
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Download Poster
                    </a>
                </div>
            )}
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">Invitation</h2>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {event.invitationNote || 'Details about this event will be updated soon.'}
                    </p>
                </div>
            </div>
            <div className="md:col-span-1">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">Details</h2>
                    <div className="space-y-5">
                        <EventDetailRow icon={UsersIcon} label="Category" value={event.category} />
                        <EventDetailRow icon={CalendarIcon} label="Date" value={formatDates(event.startDate, event.endDate)} />
                        <EventDetailRow icon={MapPinIcon} label="Location" value={event.location} />
                        <EventDetailRow icon={UsersIcon} label="Prabodhak" value={event.organizer} />
                        <EventDetailRow icon={LanguagesIcon} label="Language" value={event.language} />
                    </div>
                </div>
            </div>
        </div>

      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 z-10">
        <div className="max-w-4xl mx-auto">
            <button className="w-full px-6 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Register Now
            </button>
        </div>
      </div>
    </div>
  );
};
