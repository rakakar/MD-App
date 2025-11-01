import React, { useState } from 'react';
import { Book } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, ListIcon } from './icons';

export const ReaderView: React.FC<{ book: Book; onBack: () => void }> = ({ book, onBack }) => {
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [isTocOpen, setIsTocOpen] = useState(false);

    const goToChapter = (index: number) => {
        if (index >= 0 && index < book.chapters.length) {
            setCurrentChapterIndex(index);
            setIsTocOpen(false); // Close ToC on mobile after selection
        }
    };

    const currentChapter = book.chapters[currentChapterIndex];

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900">
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                     <button onClick={onBack} className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        Library
                    </button>
                    <button onClick={() => setIsTocOpen(!isTocOpen)} className="md:hidden p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ListIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="text-center font-semibold text-slate-700 dark:text-slate-300 hidden md:block">
                    {book.title}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => goToChapter(currentChapterIndex - 1)} 
                        disabled={currentChapterIndex === 0}
                        className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Previous Chapter"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => goToChapter(currentChapterIndex + 1)} 
                        disabled={currentChapterIndex === book.chapters.length - 1}
                        className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Next Chapter"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>
            
            <div className="flex-1 flex overflow-hidden">
                {/* Table of Contents (Desktop) */}
                <aside className="hidden md:block w-72 h-full border-r border-slate-200 dark:border-slate-700 overflow-y-auto p-4">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">{book.title}</h3>
                    <nav>
                        <ul>
                            {book.chapters.map((chapter, index) => (
                                <li key={chapter.id}>
                                    <a 
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); goToChapter(index); }}
                                        className={`block p-2 rounded-md text-sm transition-colors ${
                                            index === currentChapterIndex 
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200 font-semibold'
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {chapter.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                {/* Table of Contents (Mobile - Overlay) */}
                {isTocOpen && (
                     <div className="md:hidden fixed inset-0 z-20" role="dialog" aria-modal="true">
                        <div onClick={() => setIsTocOpen(false)} className="absolute inset-0 bg-black/50"></div>
                        <aside className="absolute top-0 left-0 w-72 h-full bg-white dark:bg-slate-800 overflow-y-auto p-4 shadow-lg">
                            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">{book.title}</h3>
                             <nav>
                                <ul>
                                    {book.chapters.map((chapter, index) => (
                                        <li key={chapter.id}>
                                            <a 
                                                href="#"
                                                onClick={(e) => { e.preventDefault(); goToChapter(index); }}
                                                className={`block p-2 rounded-md text-sm transition-colors ${
                                                    index === currentChapterIndex 
                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200 font-semibold'
                                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {chapter.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </aside>
                     </div>
                )}
                
                {/* Main Content */}
                <main className="flex-1 h-full overflow-y-auto">
                    <article className="max-w-3xl mx-auto p-6 md:p-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">{currentChapter.title}</h1>
                        <div className="mt-8 text-lg leading-relaxed text-slate-700 dark:text-slate-300 prose prose-lg dark:prose-invert max-w-none">
                            <p>
                                {currentChapter.content}
                            </p>
                        </div>
                    </article>
                </main>
            </div>
        </div>
    );
};
