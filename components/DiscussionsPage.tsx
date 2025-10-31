import React, { useState } from 'react';
import { MOCK_THREADS } from '../constants';
import { Thread } from '../types';
import { DiscussionThread } from './DiscussionThread';
import { Composer } from './Composer';

const ThreadListItem: React.FC<{ thread: Thread; onSelect: (thread: Thread) => void; isSelected: boolean }> = ({ thread, onSelect, isSelected }) => (
  <div
    onClick={() => onSelect(thread)}
    className={`p-4 border-l-4 cursor-pointer transition-colors duration-200 ${
      isSelected 
        ? 'bg-white dark:bg-slate-800 border-indigo-500' 
        : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
    }`}
  >
    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{thread.title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
      By {thread.author.name} &middot; {thread.createdAt}
    </p>
    <div className="flex items-center justify-between mt-2 text-sm text-slate-600 dark:text-slate-400">
      <span>{thread.replies.length} replies</span>
      <span>{thread.resonates} resonates</span>
    </div>
  </div>
);

interface ThreadListProps {
  threads: Thread[];
  onSelect: (thread: Thread) => void;
  selectedThreadId: string | null;
  onShowComposer: () => void;
  isComposerVisible: boolean;
  onAddThread: (title: string) => void;
}

const ThreadList: React.FC<ThreadListProps> = ({ threads, onSelect, selectedThreadId, onShowComposer, isComposerVisible, onAddThread }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold">Discussions</h2>
          <button 
              onClick={onShowComposer}
              className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              New Discussion
          </button>
          {isComposerVisible && (
              <div className="mt-4">
                  <Composer placeholder="What's the title of your discussion?" onSubmit={onAddThread} buttonText="Create Thread" />
              </div>
          )}
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


export const DiscussionsPage: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>(MOCK_THREADS);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const handleAddThread = (title: string) => {
      // This is a simplified version. A real implementation would need more fields.
      const newThread: Thread = {
          id: `t${threads.length + 1}`,
          title,
          body: 'This is the body of the new thread. In a real app, a full composer would open.',
          author: { id: 'currentUser', name: 'You', avatarUrl: 'https://picsum.photos/seed/current/100/100', city: 'Your City', country: 'Your Country', studyLevel: 'Foundation', interests: [], bio: '' },
          tags: [],
          createdAt: 'Just now',
          resonates: 0,
          replies: []
      };
      setThreads(prev => [newThread, ...prev]);
      setSelectedThread(newThread);
      setShowComposer(false);
  }

  return (
    <div className="h-full bg-slate-100/50 dark:bg-slate-900/50">
      {/* Mobile view: Navigate between list and detail */}
      <div className="md:hidden h-full">
        {selectedThread ? (
          <div className="h-full overflow-y-auto">
            <DiscussionThread thread={selectedThread} onBack={() => setSelectedThread(null)} showBackButton={true} />
          </div>
        ) : (
          <ThreadList
            threads={threads}
            onSelect={setSelectedThread}
            selectedThreadId={null}
            onShowComposer={() => setShowComposer(!showComposer)}
            isComposerVisible={showComposer}
            onAddThread={handleAddThread}
          />
        )}
      </div>

      {/* Desktop view: two-panel layout */}
      <div className="hidden md:flex h-full">
        <div className="w-1/3 lg:w-1/4 h-full border-r border-slate-200 dark:border-slate-700">
            <ThreadList
                threads={threads}
                onSelect={setSelectedThread}
                selectedThreadId={selectedThread?.id || null}
                onShowComposer={() => setShowComposer(!showComposer)}
                isComposerVisible={showComposer}
                onAddThread={handleAddThread}
            />
        </div>
        <main className="w-2/3 lg:w-3/4 h-full overflow-y-auto">
          {selectedThread ? (
            <DiscussionThread thread={selectedThread} onBack={() => {}} showBackButton={false} />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-4">
              <p className="text-slate-500">Select a discussion from the list to read it.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
