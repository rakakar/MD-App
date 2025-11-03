import React, { useState, useMemo } from 'react';
import { Thread, Reply, User } from '../types';
import { HeartIcon, SparklesIcon, BotIcon, ReplyIcon } from './icons';
import { summarizeText, generateTags } from '../services/geminiService';
import { Composer } from './Composer';

interface DiscussionThreadProps {
  thread: Thread;
  onBack: () => void;
  showBackButton?: boolean;
  currentUser: User;
}

type ReplyNodeData = Reply & { children: ReplyNodeData[] };

const AISummary: React.FC<{ threadBody: string }> = ({ threadBody }) => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSummarize = async () => {
        setIsLoading(true);
        const result = await summarizeText(threadBody);
        setSummary(result);
        setIsLoading(false);
    };

    if (summary) {
        return (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg dark:bg-slate-800 dark:border-indigo-900">
                <h3 className="flex items-center font-semibold text-indigo-800 dark:text-indigo-300">
                    <BotIcon className="w-5 h-5 mr-2" />
                    AI Summary
                </h3>
                <ul className="mt-2 ml-2 list-disc list-inside text-slate-700 dark:text-slate-300">
                    {summary.split('\n').map((line, index) => line.trim() && <li key={index}>{line.replace(/^- /, '').replace(/^\* /, '')}</li>)}
                </ul>
            </div>
        );
    }

    return (
        <button 
            onClick={handleSummarize} 
            disabled={isLoading}
            className="mt-4 flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:text-indigo-300 dark:bg-indigo-900/50 dark:hover:bg-indigo-900"
        >
            <SparklesIcon className="w-4 h-4 mr-2" />
            {isLoading ? 'Generating...' : 'Summarize with AI'}
        </button>
    );
};

const AITags: React.FC<{ threadBody: string, existingTags: string[] }> = ({ threadBody, existingTags }) => {
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSuggestTags = async () => {
        setIsLoading(true);
        const result = await generateTags(threadBody);
        setSuggestedTags(result.filter(tag => !existingTags.includes(tag)));
        setIsLoading(false);
    };

    return (
        <div className="mt-4">
            <div className="flex flex-wrap gap-2">
                {existingTags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs text-indigo-700 bg-indigo-100 rounded-full dark:text-indigo-300 dark:bg-indigo-900">{tag}</span>
                ))}
            </div>
            {suggestedTags.length > 0 && (
                 <div className="mt-3 flex items-center flex-wrap gap-2">
                    <p className="text-xs text-slate-500 mr-2">AI Suggestions:</p>
                    {suggestedTags.map(tag => (
                        <button key={tag} className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded-full border border-green-200 hover:bg-green-200 dark:text-green-300 dark:bg-green-900 dark:border-green-800">{tag}</button>
                    ))}
                </div>
            )}
            <button 
                onClick={handleSuggestTags} 
                disabled={isLoading}
                className="mt-3 flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
                <SparklesIcon className="w-4 h-4 mr-1" />
                {isLoading ? 'Thinking...' : 'Suggest Tags'}
            </button>
        </div>
    );
};

const ReplyNode: React.FC<{ reply: ReplyNodeData; onAddReply: (text: string, image: File | null, parentId: string | null) => void; }> = ({ reply, onAddReply }) => {
    const [showComposer, setShowComposer] = useState(false);

    const handleReplySubmit = (text: string, image: File | null) => {
        onAddReply(text, image, reply.id);
        setShowComposer(false);
    };
    
    return (
         <div className="flex items-start">
            <img src={reply.author.avatarUrl} alt={reply.author.name} className="w-10 h-10 rounded-full mr-4 mt-1" />
            <div className="flex-1">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{reply.author.name}</span>
                        <span className="text-slate-500 dark:text-slate-400">{reply.createdAt}</span>
                    </div>
                    {reply.body && <p className="mt-2 text-slate-700 dark:text-slate-300">{reply.body}</p>}
                    {reply.imageUrl && (
                        <div className="mt-3">
                            <img src={reply.imageUrl} alt="Reply attachment" className="w-full max-w-xs rounded-lg object-cover" />
                        </div>
                    )}
                </div>
                <div className="mt-2 pl-2">
                    <button onClick={() => setShowComposer(prev => !prev)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                       <ReplyIcon />
                        Reply
                    </button>
                </div>
                {showComposer && (
                    <div className="mt-2">
                         <Composer placeholder={`Replying to ${reply.author.name}...`} onSubmit={handleReplySubmit} buttonText="Post Reply" compact />
                    </div>
                )}
                {reply.children.length > 0 && (
                    <div className="mt-4 pt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
                        {reply.children.map(child => (
                           <ReplyNode key={child.id} reply={child} onAddReply={onAddReply} />
                        ))}
                    </div>
                )}
            </div>
         </div>
    );
};


export const DiscussionThread: React.FC<DiscussionThreadProps> = ({ thread, onBack, showBackButton = false, currentUser }) => {
  const [replies, setReplies] = useState<Reply[]>(thread.replies);

  const handleAddReply = (text: string, image: File | null, parentId: string | null = null) => {
    const newReply: Reply = {
      id: `r${Date.now()}`,
      author: currentUser,
      body: text,
      createdAt: 'Just now',
      parentId: parentId,
      imageUrl: image ? URL.createObjectURL(image) : undefined,
    };
    setReplies(prev => [...prev, newReply]);
  };

  const replyTree = useMemo(() => {
    const buildReplyTree = (repliesList: Reply[]): ReplyNodeData[] => {
        const replyMap = new Map<string, ReplyNodeData>();
        const rootReplies: ReplyNodeData[] = [];

        repliesList.forEach(reply => {
            replyMap.set(reply.id, { ...reply, children: [] });
        });

        repliesList.forEach(reply => {
            if (reply.parentId && replyMap.has(reply.parentId)) {
                replyMap.get(reply.parentId)!.children.push(replyMap.get(reply.id)!);
            } else {
                rootReplies.push(replyMap.get(reply.id)!);
            }
        });

        return rootReplies;
    };
    return buildReplyTree(replies);
  }, [replies]);

  return (
    <div className="p-4 md:p-6">
      {showBackButton && (
        <button onClick={onBack} className="mb-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
          &larr; All Discussions
        </button>
      )}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{thread.title}</h1>
        <div className="flex items-center mt-3 text-sm text-slate-500 dark:text-slate-400">
          <img src={thread.author.avatarUrl} alt={thread.author.name} className="w-8 h-8 rounded-full mr-3" />
          <span>{thread.author.name}</span>
          <span className="mx-2">&middot;</span>
          <span>{thread.createdAt}</span>
        </div>
        
        <AITags threadBody={thread.body} existingTags={thread.tags} />

        {thread.body && <p className="mt-6 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{thread.body}</p>}
        
        {thread.imageUrl && (
            <div className="mt-4">
                <img src={thread.imageUrl} alt="Thread attachment" className="w-full max-w-lg rounded-lg object-cover" />
            </div>
        )}

        <AISummary threadBody={thread.body} />

        <div className="flex items-center justify-between mt-6 border-t dark:border-slate-700 pt-4">
          <button className="flex items-center px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-full hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900">
            <HeartIcon className="w-4 h-4 mr-2" />
            Resonate ({thread.resonates})
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">{replies.length} Replies</h2>
        <div className="space-y-6">
          {replyTree.map(replyNode => (
             <ReplyNode key={replyNode.id} reply={replyNode} onAddReply={handleAddReply} />
          ))}
        </div>
        <div className="mt-6 border-t dark:border-slate-700 pt-6">
            <h3 className="text-lg font-semibold mb-2">Join the conversation</h3>
            <Composer placeholder="Write a new reply to the main thread..." onSubmit={(text, image) => handleAddReply(text, image, null)} buttonText="Post Reply" />
        </div>
      </div>
    </div>
  );
};