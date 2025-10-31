import React, { useState } from 'react';

interface ComposerProps {
  placeholder: string;
  onSubmit: (text: string) => void;
  buttonText: string;
  compact?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({ placeholder, onSubmit, buttonText, compact = false }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 text-sm"
        rows={compact ? 2 : 4}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          className={`font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${
            compact 
              ? 'px-3 py-1.5 text-xs bg-indigo-500 text-white' 
              : 'px-4 py-2 bg-indigo-600 text-white'
          }`}
          disabled={!text.trim()}
        >
          {buttonText}
        </button>
      </div>
    </form>
  );
};