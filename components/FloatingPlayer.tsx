
import React from 'react';
import { PlayIcon, SkipForwardIcon } from './icons';

export const FloatingPlayer: React.FC = () => {
    return (
        <div className="fixed bottom-[70px] md:bottom-4 inset-x-4 md:left-auto md:w-96 z-10">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-3 flex items-center space-x-3 border border-slate-200 dark:border-slate-700">
                <img 
                    src="https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1659929294l/61229410.jpg"
                    alt="Streaming Sharing Stealing"
                    className="w-10 h-10 rounded-md flex-shrink-0"
                />
                <div className="flex-grow overflow-hidden">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Today for you</p>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">Streaming Sharing Stealing</p>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                    <button className="p-2 rounded-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-800">
                        <PlayIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-700 dark:text-slate-200">
                        <SkipForwardIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};