import React, { useState, useMemo } from 'react';
import { MOCK_THREADS, MOCK_USERS } from '../constants';
import { Thread, User } from '../types';
import { DiscussionThread } from './DiscussionThread';
import { Composer } from './Composer';

const ThreadListItem: React.FC<{ thread: Thread; onSelect: (thread: Thread) => void; isSelected: boolean }> = ({ thread, onSelect, isSelected }) => (
  <div
    onClick={() => onSelect(thread)}
    className={`flex gap-4 p-4 border-l-4 cursor-pointer transition-colors duration-200 ${
      isSelected 
        ? 'bg-white dark:bg-slate-800 border-indigo-500' 
        : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
    }`}
  >
    {thread.imageUrl && (
      <img src={thread.imageUrl} alt={thread.title} className="w-20 h-20 rounded-md object-cover flex-shrink-0" />
    )}
    <div className="flex-1">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">{thread.title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        By {thread.author.name} &middot; {thread.createdAt}
      </p>
      <div className="flex items-center justify-between mt-2 text-sm text-slate-600 dark:text-slate-400">
        <span>{thread.replies.length} replies</span>
        <span>{thread.resonates} resonates</span>
      </div>
    </div>
  </div>
);

interface ThreadListProps {
  threads: Thread[];
  onSelect: (thread: Thread) => void;
  selectedThreadId: string | null;
  onShowComposer: () => void;
  isComposerVisible: boolean;
  onAddThread: (title: string, body: string, image: File | null) => void;
  allTags: string[];
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const ThreadList: React.FC<ThreadListProps> = ({ 
    threads, 
    onSelect, 
    selectedThreadId, 
    onShowComposer, 
    isComposerVisible, 
    onAddThread,
    allTags,
    selectedTag,
    onSelectTag,
    searchTerm,
    onSearchChange
}) => {
  const [newTitle, setNewTitle] = useState('');

  const handleCreateThread = (body: string, image: File | null) => {
    if (!newTitle.trim()) return;
    onAddThread(newTitle, body, image);
    setNewTitle('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Discussions</h2>
            <button 
                onClick={onShowComposer}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                New Discussion
            </button>
        </div>
        {isComposerVisible && (
            <div className="mt-4 space-y-2">
                <input
                    type="text"
                    placeholder="What's the title of your discussion?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 text-sm"
                />
                <Composer 
                    placeholder="Add more details and an optional image..." 
                    onSubmit={handleCreateThread} 
                    buttonText="Create Thread"
                    isSubmitDisabled={!newTitle.trim()}
                />
            </div>
        )}
      </div>
      
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <input
          type="text"
          placeholder="Search discussions by keyword..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600"
        />
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">Browse Topics</h4>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                className={`flex-shrink-0 px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
        {threads.map(thread => (
          <ThreadListItem 
            key={thread.id} 
            thread={thread} 
            onSelect={onSelect}
            isSelected={selectedThreadId === thread.id}
          />
        ))}
      </div>
    </div>
  );
};

interface DiscussionsPageProps {
  currentUser: User;
}

export const DiscussionsPage: React.FC<DiscussionsPageProps> = ({ currentUser }) => {
  const [threads, setThreads] = useState<Thread[]>(MOCK_THREADS);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All Topics');

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    MOCK_THREADS.forEach(thread => {
        thread.tags.forEach(tag => tagsSet.add(tag));
    });
    return ['All Topics', ...Array.from(tagsSet)];
  }, []);

  const filteredThreads = useMemo(() => {
    return threads.filter(thread => {
      const lowerCaseSearch = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || thread.title.toLowerCase().includes(lowerCaseSearch) || thread.body.toLowerCase().includes(lowerCaseSearch);
      const matchesTag = selectedTag === 'All Topics' || thread.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [threads, searchTerm, selectedTag]);

  const handleAddThread = (title: string, body: string, image: File | null) => {
      const newThread: Thread = {
          id: `t${threads.length + 1}`,
          title,
          body: body || '',
          author: currentUser,
          tags: [],
          createdAt: 'Just now',
          resonates: 0,
          replies: [],
          imageUrl: image ? URL.createObjectURL(image) : undefined,
      };
      setThreads(prev => [newThread, ...prev]);
      setSelectedThread(newThread);
      setShowComposer(false);
      setSearchTerm('');
      setSelectedTag('All Topics');
  }

  return (
    <div className="h-full bg-slate-100/50 dark:bg-slate-900/50">
      {/* Mobile view: Navigate between list and detail */}
      <div className="md:hidden h-full">
        {selectedThread ? (
          <div className="h-full overflow-y-auto">
            <DiscussionThread thread={selectedThread} onBack={() => setSelectedThread(null)} showBackButton={true} currentUser={currentUser} />
          </div>
        ) : (
          <ThreadList
            threads={filteredThreads}
            onSelect={setSelectedThread}
            selectedThreadId={null}
            onShowComposer={() => setShowComposer(!showComposer)}
            isComposerVisible={showComposer}
            onAddThread={handleAddThread}
            allTags={allTags}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}
      </div>

      {/* Desktop view: two-panel layout */}
      <div className="hidden md:flex h-full">
        <div className="w-1/3 lg:w-1/4 h-full border-r border-slate-200 dark:border-slate-700">
            <ThreadList
                threads={filteredThreads}
                onSelect={setSelectedThread}
                selectedThreadId={selectedThread?.id || null}
                onShowComposer={() => setShowComposer(!showComposer)}
                isComposerVisible={showComposer}
                onAddThread={handleAddThread}
                allTags={allTags}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
            />
        </div>
        <main className="w-2/3 lg:w-3/4 h-full overflow-y-auto">
          {selectedThread ? (
            <DiscussionThread thread={selectedThread} onBack={() => {}} showBackButton={false} currentUser={currentUser} />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-4">
              <p className="text-slate-500">Select a discussion from the list to read it, or use the filters to narrow your search.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};