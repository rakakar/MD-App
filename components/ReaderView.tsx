import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Book, Note } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, ListIcon, BookmarkIcon, PlusCircleIcon, ClipboardIcon, HighlighterIcon } from './icons';

const NoteModal: React.FC<{
    selectedText: string;
    onSave: (noteText: string) => void;
    onClose: () => void;
}> = ({ selectedText, onSave, onClose }) => {
    const [noteText, setNoteText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(noteText);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add a Note</h3>
                        <blockquote className="mt-4 p-3 bg-slate-100 dark:bg-slate-700 border-l-4 border-indigo-500 text-slate-600 dark:text-slate-300 rounded-r-lg max-h-32 overflow-y-auto">
                            {selectedText}
                        </blockquote>
                        <textarea
                            className="w-full p-3 mt-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                            rows={5}
                            placeholder="Write your thoughts..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg mr-2">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Save Note</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface ReaderViewProps {
    book: Book;
    onBack: () => void;
    bookmarks: string[];
    notes: Note[];
    onToggleBookmark: (chapterId: string) => void;
    onAddNote: (note: Note) => void;
    initialChapterIndex?: number;
    noteToHighlight?: Note | null;
}

type SelectionPopupInfo = {
    top: number;
    left: number;
    text: string;
    start: number;
    end: number;
};

export const ReaderView: React.FC<ReaderViewProps> = ({ 
    book, 
    onBack,
    bookmarks,
    notes,
    onToggleBookmark,
    onAddNote,
    initialChapterIndex = 0,
    noteToHighlight = null,
}) => {
    const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
    const [isTocOpen, setIsTocOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'contents' | 'notes'>('contents');
    const [selectionPopup, setSelectionPopup] = useState<SelectionPopupInfo | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLElement>(null);

    const currentChapter = book.chapters[currentChapterIndex];

    useEffect(() => {
        setCurrentChapterIndex(initialChapterIndex);
    }, [book, initialChapterIndex]);
    
    useEffect(() => {
        if (highlightRef.current) {
            setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [noteToHighlight, currentChapter.id]);


    const goToChapter = (index: number) => {
        if (index >= 0 && index < book.chapters.length) {
            setCurrentChapterIndex(index);
            setIsTocOpen(false);
            setSelectionPopup(null);
            contentRef.current?.parentElement?.scrollTo(0, 0);
        }
    };

    const isBookmarked = (chapterId: string) => bookmarks.includes(chapterId);

    const handleMouseUp = () => {
        if (isNoteModalOpen) return;
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 5) {
            const range = selection.getRangeAt(0);

            // Do not show popup if selection is inside another popup/modal
            let parent = range.startContainer.parentElement;
            while(parent) {
                if (parent.closest('.fixed')) return;
                parent = parent.parentElement;
            }

            const contentEl = contentRef.current;
            if (!contentEl || !contentEl.contains(range.startContainer) || !contentEl.contains(range.endContainer)) {
                setSelectionPopup(null);
                return;
            }

            // Create a range from the start of the content container to the start of the selection
            // to robustly calculate the start offset, ignoring existing DOM nodes like <mark>.
            const preSelectionRange = document.createRange();
            preSelectionRange.selectNodeContents(contentEl);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const start = preSelectionRange.toString().length;

            // The end is just start + selection length
            const end = start + range.toString().length;
            
            if (start >= end) {
                setSelectionPopup(null);
                return;
            }

            const rect = range.getBoundingClientRect();
            const mainScrollTop = contentRef.current?.parentElement?.scrollTop || 0;
            setSelectionPopup({
                top: rect.top - 50 + mainScrollTop,
                left: rect.left + rect.width / 2,
                text: selection.toString(),
                start,
                end,
            });
        } else {
            setSelectionPopup(null);
        }
    };
    
    const handleAddNote = (noteText: string) => {
        if (selectionPopup) {
            const newNote: Note = {
                id: `note-${Date.now()}`,
                chapterId: currentChapter.id,
                selectedText: selectionPopup.text,
                noteText,
                start: selectionPopup.start,
                end: selectionPopup.end,
            };
            onAddNote(newNote);
        }
        setIsNoteModalOpen(false);
        setSelectionPopup(null);
    };

    const handleHighlight = () => {
        if (selectionPopup) {
            const newHighlight: Note = {
                id: `note-${Date.now()}`,
                chapterId: currentChapter.id,
                selectedText: selectionPopup.text,
                noteText: '', // Empty note text signifies a pure highlight
                start: selectionPopup.start,
                end: selectionPopup.end,
            };
            onAddNote(newHighlight);
            setSelectionPopup(null);
        }
    }

    const handleCopy = () => {
        if (selectionPopup) {
            navigator.clipboard.writeText(selectionPopup.text);
            setSelectionPopup(null);
        }
    }

    const bookChapterIds = useMemo(() => new Set(book.chapters.map(c => c.id)), [book.chapters]);
    const bookNotes = useMemo(() => notes.filter(note => bookChapterIds.has(note.chapterId)), [notes, bookChapterIds]);
    
    const notesByChapter = useMemo(() => {
        return bookNotes.reduce((acc, note) => {
            (acc[note.chapterId] = acc[note.chapterId] || []).push(note);
            return acc;
        }, {} as Record<string, Note[]>);
    }, [bookNotes]);

    const renderChapterContent = () => {
        const content = currentChapter.content;
        const notesForChapter = [...(notesByChapter[currentChapter.id] || [])];
        
        if (noteToHighlight && noteToHighlight.chapterId === currentChapter.id && !notesForChapter.some(n => n.id === noteToHighlight.id)) {
            notesForChapter.push(noteToHighlight);
        }

        if (notesForChapter.length === 0) {
            return <>{content}</>;
        }

        const points = new Set([0, content.length]);
        notesForChapter.forEach(note => {
            points.add(note.start);
            points.add(note.end);
        });

        const sortedPoints = Array.from(points).sort((a, b) => a - b);

        return sortedPoints.map((point, i) => {
            if (i === sortedPoints.length - 1) return null;

            const start = point;
            const end = sortedPoints[i + 1];
            if (start === end) return null;

            const segmentText = content.substring(start, end);
            
            const isNavSegment = noteToHighlight && noteToHighlight.start <= start && noteToHighlight.end >= end;
            const isRegularHighlight = !isNavSegment && notesForChapter.some(note => note.id !== noteToHighlight?.id && note.start <= start && note.end >= end);

            if (isNavSegment) {
                const isFirstSegment = start === noteToHighlight.start;
                return (
                    <mark
                        key={`${start}-${end}`}
                        ref={isFirstSegment ? highlightRef : null}
                        className="rounded px-1 py-0.5 scroll-mt-24 bg-yellow-200 text-yellow-900 dark:bg-yellow-400/30 dark:text-yellow-100"
                    >
                        {segmentText}
                    </mark>
                );
            } else if (isRegularHighlight) {
                return (
                    <mark key={`${start}-${end}`} className="rounded px-1 py-0.5 bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-200">
                        {segmentText}
                    </mark>
                );
            } else {
                return <span key={`${start}-${end}`}>{segmentText}</span>;
            }
        }).filter(Boolean);
    };

    const SidebarContent = () => (
        <aside className="w-72 h-full border-r border-slate-200 dark:border-slate-700 overflow-y-auto p-4 flex flex-col">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200 flex-shrink-0">{book.title}</h3>
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-2 flex-shrink-0">
                <button onClick={() => setActiveTab('contents')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'contents' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Contents</button>
                <button onClick={() => setActiveTab('notes')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'notes' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Notes ({bookNotes.length})</button>
            </div>
            <div className="flex-grow overflow-y-auto">
                {activeTab === 'contents' && (
                    <nav>
                        <ul>
                            {book.chapters.map((chapter, index) => (
                                <li key={chapter.id} className="flex items-center">
                                    <a 
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); goToChapter(index); }}
                                        className={`block flex-grow p-2 rounded-md text-sm transition-colors ${
                                            index === currentChapterIndex 
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200 font-semibold'
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {chapter.title}
                                    </a>
                                    {isBookmarked(chapter.id) && <BookmarkIcon className="w-4 h-4 text-indigo-500 ml-2 flex-shrink-0" fill="currentColor"/>}
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
                {activeTab === 'notes' && (
                    <div className="space-y-4">
                        {Object.keys(notesByChapter).length > 0 ? Object.entries(notesByChapter).map(([chapterId, chapterNotes]) => {
                            const chapter = book.chapters.find(c => c.id === chapterId);
                            return (
                                <div key={chapterId}>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 cursor-pointer hover:underline" onClick={() => goToChapter(book.chapters.findIndex(c => c.id === chapterId))}>{chapter?.title}</h4>
                                    {chapterNotes.map(note => (
                                        <div key={note.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2">
                                            <blockquote className="border-l-2 border-indigo-500 pl-2 text-sm text-slate-600 dark:text-slate-400 italic">"{note.selectedText}"</blockquote>
                                            {note.noteText && <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">{note.noteText}</p>}
                                        </div>
                                    ))}
                                </div>
                            )
                        }) : <p className="text-sm text-slate-500">You haven't taken any notes in this book yet.</p>}
                    </div>
                )}
            </div>
        </aside>
    );

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 md:gap-4">
                     <button onClick={onBack} className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        Library
                    </button>
                    <button onClick={() => setIsTocOpen(!isTocOpen)} className="md:hidden p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ListIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="text-center font-semibold text-slate-700 dark:text-slate-300 hidden md:block truncate px-4">
                    {currentChapter.title}
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onToggleBookmark(currentChapter.id)}
                        className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                        aria-label="Bookmark Chapter"
                    >
                        <BookmarkIcon className="w-5 h-5" fill={isBookmarked(currentChapter.id) ? 'currentColor' : 'none'} />
                    </button>
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
                <div className="hidden md:block">
                  <SidebarContent />
                </div>

                {isTocOpen && (
                     <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
                        <div onClick={() => setIsTocOpen(false)} className="absolute inset-0 bg-black/50"></div>
                        <div className="absolute top-0 left-0 w-72 h-full bg-white dark:bg-slate-800 shadow-lg">
                            <SidebarContent />
                        </div>
                     </div>
                )}
                
                <main className="flex-1 h-full overflow-y-auto relative" onMouseUp={handleMouseUp} onClick={() => selectionPopup && !isNoteModalOpen && setSelectionPopup(null)}>
                    {selectionPopup && (
                        <div 
                            className="absolute z-10 flex items-center gap-1 bg-slate-900 text-white rounded-lg shadow-lg p-1 -translate-x-1/2" 
                            style={{ top: selectionPopup.top, left: selectionPopup.left }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={handleCopy} title="Copy" className="p-2 rounded-md hover:bg-slate-700"><ClipboardIcon className="w-5 h-5"/></button>
                            <button onClick={handleHighlight} title="Highlight" className="p-2 rounded-md hover:bg-slate-700"><HighlighterIcon className="w-5 h-5"/></button>
                            <button onClick={() => setIsNoteModalOpen(true)} title="Add Note" className="p-2 rounded-md hover:bg-slate-700"><PlusCircleIcon className="w-5 h-5"/></button>
                        </div>
                    )}
                    {isNoteModalOpen && selectionPopup && (
                        <NoteModal 
                            selectedText={selectionPopup.text}
                            onSave={handleAddNote}
                            onClose={() => {
                                setIsNoteModalOpen(false);
                                setSelectionPopup(null);
                            }}
                        />
                    )}
                    <article className="max-w-3xl mx-auto p-6 md:p-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">{currentChapter.title}</h1>
                        <div ref={contentRef} className="mt-8 text-lg leading-8 text-slate-700 dark:text-slate-300 whitespace-pre-wrap selection:bg-indigo-200/50 dark:selection:bg-indigo-900/50">
                            {renderChapterContent()}
                        </div>
                    </article>
                </main>
            </div>
        </div>
    );
};