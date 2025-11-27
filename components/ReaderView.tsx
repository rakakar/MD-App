
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Book, Note } from '../types';
import { 
    ChevronLeftIcon, ChevronRightIcon, ListIcon, BookmarkIcon, PlusCircleIcon, 
    ClipboardIcon, HighlighterIcon, FileTextIcon, BookOpenIcon, HeadphonesIcon,
    SettingsIcon, ZoomInIcon, ZoomOutIcon, TypeIcon, PlayCircleIcon, 
    PauseCircleIcon, RewindIcon, FastForwardIcon, InfoIcon, ChevronDownIcon, XIcon,
    VolumeIcon
} from './icons';

// --- Mock Data ---
const PARIBHASHA: Record<string, string> = {
  'सहअस्तित्व': 'Coexistence: The fundamental nature of existence where units exist in a relationship of mutual fulfillment.',
  'जीवन': 'Jeevan (Self): The conscious unit that thinks, desires, and understands.',
  'मानव': 'Human: The combined form of the conscious self (Jeevan) and the material body.',
  'व्यवस्था': 'Order/System: The innate harmony in existence.',
  'नियम': 'Law/Rule: The regulatory force in nature.',
  'समाधान': 'Resolution: The state of having answers to "why" and "how".',
  'प्रकृति': 'Nature: The aggregate of all physical and conscious entities.',
  'सत्ता': 'Existence/Authority: The pervasive reality in which all units are submerged.',
  'ज्ञान': 'Knowledge: Understanding of reality as it is.',
  'आचरण': 'Conduct: Behavior rooted in understanding and justice.',
};

// --- Sub-components ---

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
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
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

// --- Main Reader Component ---

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

type ReaderMode = 'digital' | 'physical' | 'audio';
type ReaderTheme = 'light' | 'sepia' | 'dark';

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
    // --- State ---
    const [mode, setMode] = useState<ReaderMode>('digital');
    const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
    
    // Navigation Modal State
    const [isNavModalOpen, setIsNavModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'chapters' | 'bookmarks' | 'notes'>('chapters');
    
    // Digital Mode Settings
    const [theme, setTheme] = useState<ReaderTheme>('light');
    const [fontSize, setFontSize] = useState(18);
    const [showParibhasha, setShowParibhasha] = useState(false);
    const [selectedParibhasha, setSelectedParibhasha] = useState<{ word: string, definition: string } | null>(null);
    
    // Physical Mode Settings
    const [zoomLevel, setZoomLevel] = useState(100);

    // Audio Mode Settings
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [audioProgress, setAudioProgress] = useState(0); // 0 to 100

    // Interactions
    const [selectionPopup, setSelectionPopup] = useState<SelectionPopupInfo | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    
    // Refs
    const contentRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLElement>(null);
    const mainRef = useRef<HTMLElement>(null);

    const currentChapter = book.chapters[currentChapterIndex];

    useEffect(() => {
        setCurrentChapterIndex(initialChapterIndex);
    }, [book, initialChapterIndex]);
    
    useEffect(() => {
        if (mode === 'digital' && highlightRef.current) {
            setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [noteToHighlight, currentChapter.id, mode]);

    // --- Helpers ---

    const goToChapter = (index: number) => {
        if (index >= 0 && index < book.chapters.length) {
            setCurrentChapterIndex(index);
            setIsNavModalOpen(false);
            setSelectionPopup(null);
            setAudioProgress(0); // Reset audio for new chapter
            setIsPlaying(false);
            setSelectedParibhasha(null);
            if (mainRef.current) mainRef.current.scrollTo(0, 0);
        }
    };

    const isBookmarked = (chapterId: string) => bookmarks.includes(chapterId);

    const toggleTheme = (newTheme: ReaderTheme) => setTheme(newTheme);

    const getThemeClasses = () => {
        switch (theme) {
            case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636]';
            case 'dark': return 'bg-slate-900 text-slate-300';
            default: return 'bg-white text-slate-800';
        }
    };

    const getModeLabel = () => {
        switch(mode) {
            case 'digital': return 'Digital Mode';
            case 'physical': return 'Physical Book Mode';
            case 'audio': return 'Audio Mode';
        }
    };

    const getModeIcon = () => {
        switch(mode) {
            case 'digital': return FileTextIcon;
            case 'physical': return BookOpenIcon;
            case 'audio': return HeadphonesIcon;
        }
    };

    const CurrentModeIcon = getModeIcon();

    // --- Digital Mode Logic ---

    const handleSelection = () => {
        if (mode !== 'digital' || isNoteModalOpen) return;

        setTimeout(() => {
            const selection = window.getSelection();

            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                if (selectionPopup) setSelectionPopup(null);
                return;
            }

            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            if (selectedText.trim().length < 3) {
                 if (selectionPopup) setSelectionPopup(null);
                return;
            }

            const contentEl = contentRef.current;
            if (!contentEl || !contentEl.contains(range.commonAncestorContainer)) {
                if (selectionPopup) setSelectionPopup(null);
                return;
            }

            // Clean up coordinate calculation
            let parent = range.startContainer.parentElement;
            while (parent) {
                const position = getComputedStyle(parent).position;
                if (position === 'fixed' || position === 'absolute') {
                    return;
                }
                parent = parent.parentElement;
            }

            const preSelectionRange = document.createRange();
            preSelectionRange.selectNodeContents(contentEl);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const startOffset = preSelectionRange.toString().length;
            const endOffset = startOffset + selectedText.length;

            const container = mainRef.current;
            if (!container) return;

            const selectionRect = range.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const top = selectionRect.top - containerRect.top + container.scrollTop - 50;
            const left = selectionRect.left - containerRect.left + container.scrollLeft + selectionRect.width / 2;
            
            setSelectionPopup({
                top: Math.max(container.scrollTop, top),
                left: left,
                text: selectedText,
                start: startOffset,
                end: endOffset,
            });
        }, 10);
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
                noteText: '',
                start: selectionPopup.start,
                end: selectionPopup.end,
            };
            onAddNote(newHighlight);
            setSelectionPopup(null);
        }
    }

    // --- Content Rendering ---

    const bookChapterIds = useMemo(() => new Set(book.chapters.map(c => c.id)), [book.chapters]);
    const bookNotes = useMemo(() => notes.filter(note => bookChapterIds.has(note.chapterId)), [notes, bookChapterIds]);
    const notesByChapter = useMemo(() => {
        return bookNotes.reduce((acc, note) => {
            (acc[note.chapterId] = acc[note.chapterId] || []).push(note);
            return acc;
        }, {} as Record<string, Note[]>);
    }, [bookNotes]);

    const renderDigitalContent = () => {
        const content = currentChapter.content;
        const notesForChapter = [...(notesByChapter[currentChapter.id] || [])];
        
        if (noteToHighlight && noteToHighlight.chapterId === currentChapter.id && !notesForChapter.some(n => n.id === noteToHighlight.id)) {
            notesForChapter.push(noteToHighlight);
        }

        const points = new Set([0, content.length]);
        notesForChapter.forEach(note => {
            points.add(note.start);
            points.add(note.end);
        });

        const paribhashaMatches: {start: number, end: number, word: string}[] = [];
        if (showParibhasha) {
            Object.keys(PARIBHASHA).forEach(key => {
                const regex = new RegExp(key, 'g');
                let match;
                while ((match = regex.exec(content)) !== null) {
                    paribhashaMatches.push({ start: match.index, end: match.index + key.length, word: key });
                    points.add(match.index);
                    points.add(match.index + key.length);
                }
            });
        }

        const sortedPoints = Array.from(points).sort((a, b) => a - b);
        const renderedSegments = [];

        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const start = sortedPoints[i];
            const end = sortedPoints[i + 1];
            if (start === end) continue;

            const segmentText = content.substring(start, end);
            
            const isNavSegment = noteToHighlight && noteToHighlight.start <= start && noteToHighlight.end >= end;
            const isRegularHighlight = !isNavSegment && notesForChapter.some(note => note.id !== noteToHighlight?.id && note.start <= start && note.end >= end);
            const paribhashaMatch = showParibhasha ? paribhashaMatches.find(p => p.start <= start && p.end >= end) : null;

            let element: React.ReactNode = <span key={`${start}-${end}`}>{segmentText}</span>;

            if (paribhashaMatch) {
                element = (
                    <span 
                        key={`${start}-${end}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedParibhasha({ word: paribhashaMatch.word, definition: PARIBHASHA[paribhashaMatch.word] });
                        }}
                        className="cursor-pointer border-b-2 border-dotted border-indigo-400 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                        {segmentText}
                    </span>
                );
            } else if (isNavSegment) {
                const isFirstSegment = start === noteToHighlight.start;
                element = (
                    <mark
                        key={`${start}-${end}`}
                        ref={isFirstSegment ? highlightRef : null}
                        className="rounded px-1 py-0.5 scroll-mt-24 bg-yellow-200 text-yellow-900 dark:bg-yellow-400/30 dark:text-yellow-100"
                    >
                        {segmentText}
                    </mark>
                );
            } else if (isRegularHighlight) {
                element = (
                    <mark key={`${start}-${end}`} className="rounded px-1 py-0.5 bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-200">
                        {segmentText}
                    </mark>
                );
            }

            renderedSegments.push(element);
        }

        return renderedSegments;
    };

    // --- Floating Menus ---

    const renderDigitalContextMenu = () => (
        <div className="absolute bottom-full mb-4 right-0 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
             <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Typography</label>
                        <span className="text-xs text-slate-400">{fontSize}px</span>
                    </div>
                    <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-900 p-2 rounded-lg">
                        <span className="text-sm text-slate-500 font-serif">A</span>
                        <input 
                            type="range" 
                            min="14" max="28" step="1" 
                            value={fontSize} 
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                            className="flex-grow h-1.5 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-xl text-slate-800 dark:text-slate-200 font-serif">A</span>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Theme</label>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => toggleTheme('light')} className={`flex-1 h-10 rounded-lg border-2 ${theme === 'light' ? 'border-indigo-500 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'}`} aria-label="Light Theme"></button>
                        <button onClick={() => toggleTheme('sepia')} className={`flex-1 h-10 rounded-lg border-2 ${theme === 'sepia' ? 'border-indigo-500 bg-[#f4ecd8]' : 'border-[#e0d5c0] bg-[#f4ecd8] hover:border-[#d3c4a9]'}`} aria-label="Sepia Theme"></button>
                        <button onClick={() => toggleTheme('dark')} className={`flex-1 h-10 rounded-lg border-2 ${theme === 'dark' ? 'border-indigo-500 bg-slate-900' : 'border-slate-700 bg-slate-900 hover:border-slate-600'}`} aria-label="Dark Theme"></button>
                    </div>
                </div>
                
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <InfoIcon className="w-5 h-5 text-indigo-500 mr-2" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Paribhasha Overlay</span>
                        </div>
                        <button 
                            onClick={() => setShowParibhasha(!showParibhasha)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showParibhasha ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showParibhasha ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
             </div>
        </div>
    );

    const renderPhysicalContextMenu = () => (
        <div className="absolute bottom-full mb-4 right-0 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 block">Zoom Level ({zoomLevel}%)</label>
            <div className="flex items-center justify-between gap-4 mb-4">
                <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                    <ZoomOutIcon className="w-5 h-5" />
                </button>
                <input 
                    type="range" 
                    min="50" max="200" step="10" 
                    value={zoomLevel} 
                    onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                    className="flex-grow h-1.5 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                    <ZoomInIcon className="w-5 h-5" />
                </button>
            </div>
            <button 
                onClick={() => setZoomLevel(100)}
                className="w-full py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
            >
                Reset View
            </button>
        </div>
    );

    const renderAudioContextMenu = () => (
        <div className="absolute bottom-full mb-4 right-0 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
             <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 block">Audio Controls</label>
             
             <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Playback Speed</label>
                <div className="grid grid-cols-4 gap-2">
                    {[0.5, 1, 1.5, 2].map(speed => (
                        <button 
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`py-1 text-xs font-bold rounded-md border ${playbackSpeed === speed ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400'}`}
                    >
                        {speed}x
                    </button>
                    ))}
                </div>
             </div>
        </div>
    );

    // --- Main View Renders ---

    return (
        <div className={`h-full flex flex-col relative transition-colors duration-300 ${mode === 'digital' ? getThemeClasses() : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200'}`}>
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-30 absolute top-0 left-0 right-0 h-16">
                
                {/* Left: Back & Title */}
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
                     <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0">
                        <ChevronLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div className="flex flex-col min-w-0">
                         <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">{book.title}</h1>
                         <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">{currentChapter.title}</p>
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2 z-20 flex-shrink-0">
                     {/* Mode Switcher */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                        >
                            <CurrentModeIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{getModeLabel()}</span>
                            <ChevronDownIcon className="w-3 h-3 text-slate-500" />
                        </button>

                        {isModeDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsModeDropdownOpen(false)}></div>
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                    <button 
                                        onClick={() => { setMode('digital'); setIsModeDropdownOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === 'digital' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        <FileTextIcon className="w-4 h-4" />
                                        Digital Mode
                                    </button>
                                    <button 
                                        onClick={() => { setMode('physical'); setIsModeDropdownOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === 'physical' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        <BookOpenIcon className="w-4 h-4" />
                                        Physical Book Mode
                                    </button>
                                    <button 
                                        onClick={() => { setMode('audio'); setIsModeDropdownOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === 'audio' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        <HeadphonesIcon className="w-4 h-4" />
                                        Audio Mode
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Navigation Menu Button */}
                    <button 
                        onClick={() => setIsNavModalOpen(true)} 
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Contents & Notes"
                    >
                        <ListIcon className="w-6 h-6"/>
                    </button>
                </div>
            </header>
            
            <div className="flex-1 flex overflow-hidden relative pt-16">
                
                {/* Unified Navigation Bottom Sheet */}
                <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isNavModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsNavModalOpen(false)}>
                    <div 
                        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl h-[80vh] flex flex-col transform transition-transform duration-300 ${isNavModalOpen ? 'translate-y-0' : 'translate-y-full'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex flex-col border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                            <div className="flex items-center justify-between p-4 pb-2">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Book Navigation</h3>
                                <button onClick={() => setIsNavModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500">
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex px-4 mt-2 space-x-6 overflow-x-auto scrollbar-hide">
                                <button 
                                    onClick={() => setActiveTab('chapters')} 
                                    className={`flex items-center pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'chapters' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <ListIcon className="w-4 h-4 mr-2" />
                                    Chapters
                                </button>
                                <button 
                                    onClick={() => setActiveTab('bookmarks')} 
                                    className={`flex items-center pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'bookmarks' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <BookmarkIcon className="w-4 h-4 mr-2" />
                                    Bookmarks ({book.chapters.filter(c => isBookmarked(c.id)).length})
                                </button>
                                <button 
                                    onClick={() => setActiveTab('notes')} 
                                    className={`flex items-center pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'notes' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <FileTextIcon className="w-4 h-4 mr-2" />
                                    Notes ({bookNotes.length})
                                </button>
                            </div>
                        </div>

                         <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 p-4">
                            {/* Chapters Tab */}
                            {activeTab === 'chapters' && (
                                <ul className="space-y-2">
                                    {book.chapters.map((chapter, index) => (
                                        <li key={chapter.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors border border-transparent ${
                                            index === currentChapterIndex 
                                            ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900 shadow-sm'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                        }`}>
                                            <button 
                                                onClick={() => goToChapter(index)}
                                                className="flex-1 text-left flex items-start"
                                            >
                                                <span className="mr-3 opacity-50 font-mono text-sm mt-0.5">{String(index + 1).padStart(2, '0')}</span>
                                                <span className={`text-sm ${index === currentChapterIndex ? 'font-bold text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {chapter.title}
                                                </span>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onToggleBookmark(chapter.id); }}
                                                className={`p-2 rounded-full transition-colors ${isBookmarked(chapter.id) ? 'text-indigo-500 hover:text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
                                            >
                                                <BookmarkIcon className="w-5 h-5" fill={isBookmarked(chapter.id) ? 'currentColor' : 'none'} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Bookmarks Tab */}
                            {activeTab === 'bookmarks' && (
                                <div className="space-y-2">
                                    {book.chapters.filter(c => isBookmarked(c.id)).length === 0 ? (
                                        <div className="text-center py-10 text-slate-500">
                                            <BookmarkIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                                            <p>No bookmarks yet.</p>
                                        </div>
                                    ) : (
                                        book.chapters.filter(c => isBookmarked(c.id)).map(chapter => (
                                            <div key={chapter.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                                <div 
                                                    onClick={() => goToChapter(book.chapters.findIndex(c => c.id === chapter.id))}
                                                    className="flex-1 cursor-pointer"
                                                >
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{chapter.title}</p>
                                                    <p className="text-xs text-slate-500 mt-1">Chapter {book.chapters.findIndex(c => c.id === chapter.id) + 1}</p>
                                                </div>
                                                <button 
                                                    onClick={() => onToggleBookmark(chapter.id)} 
                                                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                                                >
                                                    <BookmarkIcon className="w-5 h-5" fill="currentColor" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Notes Tab */}
                            {activeTab === 'notes' && (
                                <div className="space-y-4">
                                    {bookNotes.length === 0 ? (
                                         <div className="text-center py-10 text-slate-500">
                                            <FileTextIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                                            <p>No notes or highlights yet.</p>
                                        </div>
                                    ) : (
                                        bookNotes.map(note => {
                                            const noteChapter = book.chapters.find(c => c.id === note.chapterId);
                                            const chapterIdx = book.chapters.findIndex(c => c.id === note.chapterId);
                                            return (
                                                <div key={note.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                                    <div 
                                                        className="cursor-pointer"
                                                        onClick={() => {
                                                            goToChapter(chapterIdx);
                                                            // In a real implementation, we would also scroll to the note position
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
                                                                {noteChapter?.title || 'Unknown Chapter'}
                                                            </span>
                                                        </div>
                                                        <blockquote className="text-sm text-slate-600 dark:text-slate-300 italic border-l-4 border-amber-400 pl-3 mb-3">
                                                            "{note.selectedText}"
                                                        </blockquote>
                                                        {note.noteText && (
                                                            <p className="text-sm text-slate-800 dark:text-slate-200">{note.noteText}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <main 
                    ref={mainRef}
                    className="flex-1 h-full overflow-y-auto relative outline-none scroll-smooth pb-32" 
                    onMouseUp={handleSelection}
                    onTouchEnd={handleSelection}
                    onScroll={() => {
                        setSelectionPopup(null);
                        if (isContextMenuOpen) setIsContextMenuOpen(false);
                        if (isModeDropdownOpen) setIsModeDropdownOpen(false);
                    }}
                >
                    {/* Mode: Digital */}
                    {mode === 'digital' && (
                        <div className="max-w-3xl mx-auto p-6 md:p-10 min-h-full">
                            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center mt-4">{currentChapter.title}</h2>
                            <div 
                                ref={contentRef}
                                style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                                className="whitespace-pre-wrap font-serif"
                            >
                                {renderDigitalContent()}
                            </div>
                            
                            {/* Navigation Footer */}
                            <div className="mt-20 pt-8 border-t border-slate-200/20 flex justify-between">
                                <button 
                                    onClick={() => goToChapter(currentChapterIndex - 1)} 
                                    disabled={currentChapterIndex === 0}
                                    className="flex items-center px-4 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 mr-2" /> Previous Chapter
                                </button>
                                <button 
                                    onClick={() => goToChapter(currentChapterIndex + 1)} 
                                    disabled={currentChapterIndex === book.chapters.length - 1}
                                    className="flex items-center px-4 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                                >
                                    Next Chapter <ChevronRightIcon className="w-5 h-5 ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mode: Physical Book Mirror */}
                    {mode === 'physical' && (
                         <div className="h-full w-full bg-slate-200 dark:bg-slate-950 overflow-auto flex items-center justify-center p-4 sm:p-8">
                             <div 
                                className="bg-white shadow-2xl transition-transform duration-200 origin-center relative flex-shrink-0"
                                style={{ 
                                    width: 'min(90vw, 600px)', 
                                    aspectRatio: '2/3',
                                    transform: `scale(${zoomLevel / 100})` 
                                }}
                             >
                                 <div className="w-full h-full p-4 sm:p-12 flex flex-col items-center border border-slate-300 relative">
                                     <div className="absolute top-0 right-0 p-4">
                                        <span className="text-[10px] sm:text-xs text-slate-400 font-mono">SCAN-ID: 8842-A</span>
                                     </div>
                                     <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-8 font-serif italic text-center w-full">{book.title}</p>
                                     <div className="w-full h-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-center p-4 sm:p-8">
                                         <div>
                                            <BookOpenIcon className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-4" />
                                            <h3 className="text-slate-500 font-bold text-sm sm:text-lg">{currentChapter.title}</h3>
                                            <p className="text-slate-400 text-xs sm:text-sm mt-2">Physical book scan placeholder.</p>
                                            <p className="text-slate-300 text-[10px] sm:text-xs mt-4 max-w-xs mx-auto">This mode mirrors the physical book layout. In a production app, high-resolution page scans would be rendered here.</p>
                                         </div>
                                     </div>
                                     <div className="mt-4 sm:mt-8 flex justify-between w-full text-slate-400 text-xs sm:text-sm font-serif">
                                         <span>{currentChapterIndex + 45}</span>
                                     </div>
                                 </div>
                             </div>
                         </div>
                    )}

                    {/* Mode: Audio Player */}
                    {mode === 'audio' && (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 text-white relative overflow-hidden">
                            {/* Background Blur */}
                            <div className="absolute inset-0 z-0">
                                <img src={book.coverUrl} alt="Background" className="w-full h-full object-cover opacity-30 blur-3xl scale-125" />
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
                            </div>

                            <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
                                {/* Album Art */}
                                <div className="w-64 h-64 sm:w-80 sm:h-80 bg-slate-800 rounded-xl shadow-2xl mb-10 overflow-hidden relative group">
                                    <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                                
                                {/* Info */}
                                <div className="text-center mb-8 w-full">
                                    <h2 className="text-2xl font-bold mb-2 truncate px-4">{currentChapter.title}</h2>
                                    <p className="text-slate-300 text-base font-medium">{book.author}</p>
                                </div>

                                {/* Fake Waveform */}
                                <div className="flex items-center justify-center gap-1 h-12 mb-8 w-full px-8 opacity-70">
                                    {[...Array(20)].map((_, i) => (
                                        <div 
                                            key={i} 
                                            className="w-1.5 bg-indigo-400 rounded-full animate-pulse" 
                                            style={{ 
                                                height: isPlaying ? `${Math.random() * 100}%` : '20%', 
                                                animationDuration: `${0.5 + Math.random()}s`,
                                                animationPlayState: isPlaying ? 'running' : 'paused'
                                            }} 
                                        />
                                    ))}
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full mb-6 group">
                                    <div className="relative w-full h-1.5 bg-slate-700 rounded-full cursor-pointer overflow-hidden">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100 ease-linear" 
                                            style={{ width: `${audioProgress}%` }}
                                        ></div>
                                        <input 
                                            type="range" 
                                            min="0" max="100" 
                                            value={audioProgress}
                                            onChange={(e) => setAudioProgress(parseInt(e.target.value))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex justify-between mt-2 text-xs font-medium text-slate-400">
                                        <span>{Math.floor((audioProgress / 100) * 15)}:{(Math.floor(((audioProgress / 100) * 15 * 60) % 60)).toString().padStart(2, '0')}</span>
                                        <span>15:00</span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center justify-between w-full px-4">
                                     <button 
                                        onClick={() => goToChapter(currentChapterIndex - 1)} 
                                        disabled={currentChapterIndex === 0}
                                        className="p-3 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                                    >
                                        <ChevronLeftIcon className="w-6 h-6" />
                                    </button>
                                    
                                    <div className="flex items-center gap-6">
                                        <button 
                                            className="p-2 text-slate-300 hover:text-white transition-colors"
                                            onClick={() => setAudioProgress(Math.max(0, audioProgress - 5))}
                                        >
                                            <RewindIcon className="w-8 h-8" />
                                        </button>
                                        <button 
                                            className="p-5 bg-white text-black rounded-full shadow-lg hover:scale-105 transition-all active:scale-95"
                                            onClick={() => setIsPlaying(!isPlaying)}
                                        >
                                            {isPlaying ? <PauseCircleIcon className="w-8 h-8" /> : <PlayCircleIcon className="w-8 h-8 ml-0.5" />}
                                        </button>
                                        <button 
                                            className="p-2 text-slate-300 hover:text-white transition-colors"
                                            onClick={() => setAudioProgress(Math.min(100, audioProgress + 5))}
                                        >
                                            <FastForwardIcon className="w-8 h-8" />
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => goToChapter(currentChapterIndex + 1)} 
                                        disabled={currentChapterIndex === book.chapters.length - 1}
                                        className="p-3 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                                    >
                                        <ChevronRightIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Digital Mode Selection Popover */}
                    {selectionPopup && mode === 'digital' && (
                        <div 
                            className="absolute z-50 flex items-center gap-1 bg-slate-900 text-white rounded-lg shadow-xl p-1.5 -translate-x-1/2 animate-in fade-in zoom-in duration-200" 
                            style={{ top: selectionPopup.top, left: selectionPopup.left }}
                            onMouseUp={e => e.stopPropagation()}
                            onTouchEnd={e => e.stopPropagation()}
                        >
                            <button onClick={() => {navigator.clipboard.writeText(selectionPopup.text); setSelectionPopup(null);}} title="Copy" className="p-2 rounded-md hover:bg-slate-700 transition-colors"><ClipboardIcon className="w-4 h-4"/></button>
                            <button onClick={handleHighlight} title="Highlight" className="p-2 rounded-md hover:bg-slate-700 transition-colors"><HighlighterIcon className="w-4 h-4"/></button>
                            <button onClick={() => setIsNoteModalOpen(true)} title="Add Note" className="p-2 rounded-md hover:bg-slate-700 transition-colors"><PlusCircleIcon className="w-4 h-4"/></button>
                        </div>
                    )}
                </main>
            </div>

            {/* Context Menu Floating Action Button (Bottom Right) */}
            <div className="fixed bottom-6 right-6 z-40">
                <div className="relative">
                    {isContextMenuOpen && (
                        mode === 'digital' ? renderDigitalContextMenu() :
                        mode === 'physical' ? renderPhysicalContextMenu() :
                        renderAudioContextMenu()
                    )}
                    <button 
                        onClick={() => setIsContextMenuOpen(!isContextMenuOpen)}
                        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border transition-all duration-300 ${isContextMenuOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700 hover:scale-105'}`}
                        title="Mode Settings"
                    >
                        {mode === 'digital' && <TypeIcon className="w-6 h-6" />}
                        {mode === 'physical' && <ZoomInIcon className="w-6 h-6" />}
                        {mode === 'audio' && <SettingsIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Paribhasha Bottom Sheet */}
            <div className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${selectedParibhasha ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSelectedParibhasha(null)}>
                <div 
                    className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl p-6 transform transition-transform duration-300 ${selectedParibhasha ? 'translate-y-0' : 'translate-y-full'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-start mb-4">
                         <h3 className="font-bold text-2xl text-indigo-700 dark:text-indigo-400">{selectedParibhasha?.word}</h3>
                         <button onClick={() => setSelectedParibhasha(null)} className="p-2 -mr-2 -mt-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <p className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                        {selectedParibhasha?.definition}
                    </p>
                </div>
            </div>

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
        </div>
    );
};
