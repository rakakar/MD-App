import React, { useState, useRef } from 'react';
import { PaperclipIcon, XIcon } from './icons';

interface ComposerProps {
  placeholder: string;
  onSubmit: (text: string, image: File | null) => void;
  buttonText: string;
  compact?: boolean;
  isSubmitDisabled?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({ placeholder, onSubmit, buttonText, compact = false, isSubmitDisabled = false }) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() || imageFile) {
      onSubmit(text, imageFile);
      setText('');
      removeImage();
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
      {imagePreview && (
        <div className="mt-2 relative w-32 h-32">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
            <button
                type="button"
                onClick={removeImage}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/75"
                aria-label="Remove image"
            >
                <XIcon className="w-4 h-4" />
            </button>
        </div>
      )}
      <div className="flex justify-end items-center mt-2">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
        />
        <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 mr-2"
            aria-label="Attach image"
        >
            <PaperclipIcon className="w-5 h-5" />
        </button>
        <button
          type="submit"
          className={`font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${
            compact 
              ? 'px-3 py-1.5 text-xs bg-indigo-500 text-white' 
              : 'px-4 py-2 bg-indigo-600 text-white'
          }`}
          disabled={isSubmitDisabled || (!text.trim() && !imageFile)}
        >
          {buttonText}
        </button>
      </div>
    </form>
  );
};