import React, { useState, useMemo } from 'react';
import { Book, Note, Chapter } from '../types';
import { BookmarkIcon, FileTextIcon, BookOpenIcon } from './icons';

interface BookmarksPageProps {
    books: Book[];
    bookmarks: string[];
    notes: Note[];
    onNavigateToChapter: (bookId: string, chapterId: string) => void;
    onToggleBookmark: (chapterId: string) => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({ books, bookmarks, notes, onNavigateToChapter, onToggleBookmark }) => {
    const [activeTab, setActiveTab] = useState<'bookmarks' | 'notes'>('bookmarks');
    
    const bookmarkedItemsByBook = useMemo(() => {
        const items: Record<string, { book: Book, chapters: Chapter[] }> = {};
        for (const book of books) {
            for (const chapter of book.chapters) {
                if (bookmarks.includes(chapter.id)) {
                    if (!items[book.id]) {
                        items[book.id] = { book, chapters: [] };
                    }
                    items[book.id].chapters.push(chapter);
                }
            }
        }
        return Object.values(items);
    }, [books, bookmarks]);
    
    const notesByBook = useMemo(() => {
        const items: Record<string, { book: Book, notes: (Note & { chapterTitle: string })[] }> = {};
        for (const note of notes) {
            let chapter, book;
            for (const b of books) {
                const ch = b.chapters.find(c => c.id === note.chapterId);
                if (ch) {
                    chapter = ch;
                    book = b;
                    break;
                }
            }
            if (book && chapter) {
                if (!items[book.id]) {
                    items[book.id] = { book, notes: [] };
                }
                items[book.id].notes.push({ ...note, chapterTitle: chapter.title });
            }
        }
        return Object.values(items);
    }, [books, notes]);

    const renderEmptyState = (type: 'bookmarks' | 'notes') => (
        <div className="text-center py-16">
            <div className="flex items-center justify-center">
                <div className="flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full">
                   {type === 'bookmarks' ? <BookmarkIcon className="w-8 h-8 text-slate-500" /> : <FileTextIcon className="w-8 h-8 text-slate-500" /> }
                </div>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">
                {type === 'bookmarks' ? 'No Bookmarks Yet' : 'No Notes Yet'}
            </h3>
            <p className="mt-1 text-slate-500">
                {type === 'bookmarks' 
                    ? 'You can bookmark chapters as you read to save them here.'
                    : 'Highlight text while reading to create notes.'
                }
            </p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Bookmarks & Notes</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">Your saved chapters and personal notes for easy reference.</p>
                
                <div className="mt-8 border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex -mb-px space-x-6">
                        <button onClick={() => setActiveTab('bookmarks')} className={`flex items-center px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'bookmarks' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            <BookmarkIcon className="w-5 h-5 mr-2" /> Bookmarks ({bookmarks.length})
                        </button>
                        <button onClick={() => setActiveTab('notes')} className={`flex items-center px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            <FileTextIcon className="w-5 h-5 mr-2" /> Notes ({notes.length})
                        </button>
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'bookmarks' && (
                        <div className="space-y-6">
                            {bookmarkedItemsByBook.length > 0 ? bookmarkedItemsByBook.map(({ book, chapters }) => (
                                <div key={book.id}>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">{book.title}</h2>
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
                                    {chapters.map(chapter => (
                                        <div key={chapter.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <div className="cursor-pointer flex-grow" onClick={() => onNavigateToChapter(book.id, chapter.id)}>
                                                <p className="font-semibold">{chapter.title}</p>
                                            </div>
                                            <button 
                                                onClick={() => onToggleBookmark(chapter.id)} 
                                                className="ml-4 p-2 text-indigo-600 dark:text-indigo-400"
                                                title="Remove bookmark"
                                            >
                                                <BookmarkIcon className="w-5 h-5" fill="currentColor" />
                                            </button>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            )) : renderEmptyState('bookmarks')}
                        </div>
                    )}
                    {activeTab === 'notes' && (
                        <div className="space-y-6">
                             {notesByBook.length > 0 ? notesByBook.map(({ book, notes }) => (
                                <div key={book.id}>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">{book.title}</h2>
                                    <div className="space-y-4">
                                        {notes.map(note => (
                                            <div key={note.id} className="p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                <p 
                                                    onClick={() => onNavigateToChapter(book.id, note.chapterId)}
                                                    className="font-semibold text-slate-600 dark:text-slate-300 mb-2 cursor-pointer hover:underline"
                                                >
                                                    From: {note.chapterTitle}
                                                </p>
                                                <blockquote className="border-l-4 border-indigo-400 pl-4 text-slate-600 dark:text-slate-400 italic">"{note.selectedText}"</blockquote>
                                                <p className="mt-3 text-slate-800 dark:text-slate-200">{note.noteText}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )) : renderEmptyState('notes')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};