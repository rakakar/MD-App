import React, { useState, useMemo } from 'react';
import { User, Book, Note, Chapter } from '../types';
import { EditIcon, LogOutIcon, MapPinIcon, BookmarkIcon, FileTextIcon, ShareIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { EditProfileModal } from './EditProfileModal';

interface ProfilePageProps {
    user: User;
    onUpdateUser: (updatedUser: User) => void;
    onLogout: () => void;
    books: Book[];
    bookmarks: string[];
    notes: Note[];
    onNavigateToChapter: (bookId: string, chapterId: string, noteToHighlight?: Note) => void;
    onToggleBookmark: (chapterId: string) => void;
}

const BookmarksAndNotes: React.FC<Omit<ProfilePageProps, 'user' | 'onUpdateUser' | 'onLogout'>> = ({
    books,
    bookmarks,
    notes,
    onNavigateToChapter,
    onToggleBookmark,
}) => {
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    const booksWithHighlights = useMemo(() => {
        return books.map(book => {
            const bookBookmarksCount = book.chapters.filter(c => bookmarks.includes(c.id)).length;
            const bookNotesCount = notes.filter(note => book.chapters.some(c => c.id === note.chapterId)).length;
            const highlightCount = bookBookmarksCount + bookNotesCount;

            return { book, highlightCount };
        }).filter(item => item.highlightCount > 0);
    }, [books, bookmarks, notes]);

    const selectedBookDetails = useMemo(() => {
        if (!selectedBookId) return null;
        
        const book = books.find(b => b.id === selectedBookId);
        if (!book) return null;

        const allHighlights: ({ type: 'bookmark'; data: Chapter; chapterIndex: number } | { type: 'note'; data: Note & { chapterTitle: string }; chapterIndex: number })[] = [];

        const bookmarkedChapters = book.chapters.filter(c => bookmarks.includes(c.id));
        bookmarkedChapters.forEach(chapter => {
            allHighlights.push({
                type: 'bookmark',
                data: chapter,
                chapterIndex: book.chapters.findIndex(c => c.id === chapter.id)
            });
        });

        const bookNotes = notes
            .filter(note => book.chapters.some(c => c.id === note.chapterId))
            .map(note => ({
                ...note,
                chapterTitle: book.chapters.find(c => c.id === note.chapterId)?.title || 'Unknown Chapter'
            }));
            
        bookNotes.forEach(note => {
            allHighlights.push({
                type: 'note',
                data: note,
                chapterIndex: book.chapters.findIndex(c => c.id === note.chapterId)
            });
        });

        allHighlights.sort((a, b) => a.chapterIndex - b.chapterIndex);

        return { book, highlights: allHighlights };
    }, [selectedBookId, books, bookmarks, notes]);

    const handleShare = async (item: { type: 'bookmark'; data: Chapter } | { type: 'note'; data: Note }, bookTitle: string) => {
        if (isSharing) {
            return; // Already sharing, prevent concurrent calls
        }
    
        if (!navigator.share) {
            alert("Sharing is not supported on your browser.");
            return;
        }
        
        setIsSharing(true);
        try {
            const sharePayload = item.type === 'bookmark'
                ? {
                    title: `Bookmark from ${bookTitle}`,
                    text: `I bookmarked this chapter: "${item.data.title}" in the book "${bookTitle}".`,
                  }
                : {
                    title: `Note from ${bookTitle}`,
                    text: `A note on "${item.data.selectedText}" from "${bookTitle}":\n\n${item.data.noteText}`,
                  };
            
            await navigator.share(sharePayload);
        } catch (error) {
            // User cancelling the share dialog is expected, not an error.
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('User cancelled the share dialog.');
            } else {
                console.error('Error sharing:', error);
            }
        } finally {
            setIsSharing(false);
        }
    };

    if (selectedBookDetails) {
        return (
            <div className="mt-6">
                <button onClick={() => setSelectedBookId(null)} className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4">
                    <ChevronLeftIcon className="w-5 h-5 mr-1" />
                    Back to All Books
                </button>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Highlights from {selectedBookDetails.book.title}</h2>
                <div className="space-y-4">
                    {selectedBookDetails.highlights.map((item, index) => (
                        <div key={`${item.type}-${item.data.id}-${index}`} className="p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-grow">
                                    {item.type === 'bookmark' ? (
                                        <div className="flex items-start gap-3 cursor-pointer" onClick={() => onNavigateToChapter(selectedBookDetails.book.id, item.data.id)}>
                                            <BookmarkIcon className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-1" />
                                            <div>
                                                <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Bookmarked Chapter</p>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{item.data.title}</p>
                                                <blockquote className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-3 italic border-l-2 border-slate-300 dark:border-slate-600 pl-2">
                                                    {item.data.content}
                                                </blockquote>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3 cursor-pointer" onClick={() => onNavigateToChapter(selectedBookDetails.book.id, item.data.chapterId, item.data)}>
                                            <FileTextIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                                            <div>
                                                <p className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Note from: {item.data.chapterTitle}</p>
                                                <blockquote className="border-l-4 border-amber-400 pl-4 text-slate-600 dark:text-slate-400 italic">"{item.data.selectedText}"</blockquote>
                                                <p className="mt-3 text-slate-800 dark:text-slate-200">{item.data.noteText}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-shrink-0 flex items-center">
                                    <button 
                                        onClick={() => handleShare(item, selectedBookDetails.book.title)} 
                                        className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 disabled:opacity-50" 
                                        aria-label="Share"
                                        disabled={isSharing}
                                    >
                                        <ShareIcon className="w-5 h-5" />
                                    </button>
                                    {item.type === 'bookmark' && (
                                        <button onClick={() => onToggleBookmark(item.data.id)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-red-600 dark:hover:text-red-500" aria-label="Remove Bookmark">
                                            <BookmarkIcon className="w-5 h-5" fill="currentColor" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    return (
        <div className="mt-6">
            {booksWithHighlights.length > 0 ? (
                 <div className="space-y-4">
                    {booksWithHighlights.map(({ book, highlightCount }) => (
                        <div key={book.id} onClick={() => setSelectedBookId(book.id)} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700">
                            <img src={book.coverUrl} alt={book.title} className="w-16 h-24 object-cover rounded-md flex-shrink-0" />
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{book.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{highlightCount} highlight{highlightCount !== 1 ? 's' : ''}</p>
                            </div>
                            <ChevronRightIcon className="w-6 h-6 text-slate-400" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <div className="flex items-center justify-center">
                        <div className="flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full">
                           <BookmarkIcon className="w-8 h-8 text-slate-500" />
                        </div>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">
                        No Highlights Yet
                    </h3>
                    <p className="mt-1 text-slate-500">
                        You can bookmark chapters or create notes as you read to save them here.
                    </p>
                </div>
            )}
        </div>
    );
};

export const ProfilePage: React.FC<ProfilePageProps> = (props) => {
    const { user, onUpdateUser, onLogout } = props;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'about' | 'bookmarks'>('about');
    const locationString = [user.city, user.state, user.country].filter(Boolean).join(', ');
    
    const handleSaveChanges = (updatedUser: User) => {
        onUpdateUser(updatedUser);
        setIsEditModalOpen(false);
    };

    return (
        <>
            <div className="h-full overflow-y-auto bg-slate-100/50 dark:bg-slate-900/50">
                <div className="max-w-4xl mx-auto p-4 md:p-8">
                    <div className="relative h-48 bg-indigo-200 dark:bg-indigo-900 rounded-2xl">
                        <img src="https://picsum.photos/seed/cover/1200/300" alt="Cover" className="w-full h-full object-cover rounded-2xl" />
                        <div className="absolute -bottom-16 left-8">
                            <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 rounded-full border-4 border-slate-100/50 dark:border-slate-900/50" />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 pb-8">
                        <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                           <EditIcon className="w-4 h-4" /> Edit Profile
                        </button>
                         <button onClick={onLogout} className="ml-2 flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                           <LogOutIcon className="w-4 h-4" /> Logout
                        </button>
                    </div>

                    <div className="mt-8">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{user.name}</h1>
                        <div className="mt-2 flex items-center gap-4 text-slate-500 dark:text-slate-400">
                            <span className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-full dark:text-indigo-300 dark:bg-indigo-900">{user.studyLevel}</span>
                            <div className="flex items-center gap-1.5">
                               <MapPinIcon className="w-4 h-4" /> {locationString}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 border-b border-slate-200 dark:border-slate-700">
                        <nav className="flex -mb-px space-x-6">
                            <button onClick={() => setActiveTab('about')} className={`px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'about' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                About
                            </button>
                            <button onClick={() => setActiveTab('bookmarks')} className={`flex items-center px-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'bookmarks' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <BookmarkIcon className="w-5 h-5 mr-2" /> Bookmarks & Notes
                            </button>
                        </nav>
                    </div>
                    
                    {activeTab === 'about' && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">About Me</h2>
                                <p className="mt-2 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{user.bio || 'No bio provided.'}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                 <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Interests</h2>
                                 <div className="mt-3 flex flex-wrap gap-2">
                                    {user.interests.length > 0 ? user.interests.map(interest => (
                                        <span key={interest} className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-full dark:text-slate-400 dark:bg-slate-700">{interest}</span>
                                    )) : <p className="text-sm text-slate-500">No interests listed.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'bookmarks' && (
                        <BookmarksAndNotes {...props} />
                    )}

                </div>
            </div>
            {isEditModalOpen && (
                <EditProfileModal user={user} onSave={handleSaveChanges} onClose={() => setIsEditModalOpen(false)} />
            )}
        </>
    );
};