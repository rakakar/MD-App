import React, { useState, useEffect } from 'react';
import { MOCK_BOOKS } from '../constants';
import { Book, Note } from '../types';
import { ReaderView } from './ReaderView';

const BookCard: React.FC<{ book: Book; onRead: (book: Book) => void }> = ({ book, onRead }) => (
  <div onClick={() => onRead(book)} className="cursor-pointer group">
    <div className="aspect-[2/3] overflow-hidden rounded-lg">
      <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    </div>
    <h3 className="mt-2 font-semibold text-slate-800 dark:text-slate-200">{book.title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">{book.author}</p>
  </div>
);

interface ReadPageProps {
  bookmarks: string[];
  notes: Note[];
  onToggleBookmark: (chapterId: string) => void;
  onAddNote: (note: Note) => void;
  bookToOpen: string | null;
  chapterToOpen: string | null;
  noteToHighlight: Note | null;
  onDidOpenBook: () => void;
}


export const ReadPage: React.FC<ReadPageProps> = ({
  bookmarks,
  notes,
  onToggleBookmark,
  onAddNote,
  bookToOpen,
  chapterToOpen,
  noteToHighlight,
  onDidOpenBook,
}) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    if (bookToOpen) {
      const book = MOCK_BOOKS.find(b => b.id === bookToOpen);
      if (book) {
        setSelectedBook(book);
      }
    }
  }, [bookToOpen]);


  if (selectedBook) {
    const initialChapterIndex = chapterToOpen
      ? selectedBook.chapters.findIndex(c => c.id === chapterToOpen)
      : 0;

    const handleBack = () => {
      setSelectedBook(null);
      if (bookToOpen) {
        onDidOpenBook();
      }
    };

    return (
      <ReaderView
        book={selectedBook}
        onBack={handleBack}
        bookmarks={bookmarks}
        notes={notes}
        onToggleBookmark={onToggleBookmark}
        onAddNote={onAddNote}
        initialChapterIndex={initialChapterIndex >= 0 ? initialChapterIndex : 0}
        noteToHighlight={noteToHighlight}
      />
    );
  }

  const handleSelectBookFromLibrary = (book: Book) => {
    if (bookToOpen) {
        onDidOpenBook();
    }
    setSelectedBook(book);
  }

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Library</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Foundational texts of Madhyasth Darshan.</p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
          {MOCK_BOOKS.map(book => (
            <BookCard key={book.id} book={book} onRead={handleSelectBookFromLibrary} />
          ))}
        </div>
      </div>
    </div>
  );
};