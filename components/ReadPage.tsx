import React, { useState } from 'react';
import { MOCK_BOOKS } from '../constants';
import { Book } from '../types';
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

export const ReadPage: React.FC = () => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  if (selectedBook) {
    return <ReaderView book={selectedBook} onBack={() => setSelectedBook(null)} />;
  }

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Library</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Foundational texts of Madhyasth Darshan.</p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
          {MOCK_BOOKS.map(book => (
            <BookCard key={book.id} book={book} onRead={setSelectedBook} />
          ))}
        </div>
      </div>
    </div>
  );
};