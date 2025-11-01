
import React, { useState, useMemo } from 'react';
import { COMMUNITY_CONTACTS } from '../constants';
import { ProfileCard } from './ProfileCard';
import { ProfileListItem } from './ProfileListItem';
import { GridIcon, ListIcon } from './icons';

export const DirectoryPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [stateFilter, setStateFilter] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const states = useMemo(() => {
        const stateSet = new Set(COMMUNITY_CONTACTS.map(user => user.state).filter((s): s is string => !!s));
        return ['All', ...Array.from(stateSet).sort()];
    }, []);

    const filteredUsers = useMemo(() => {
        return COMMUNITY_CONTACTS.filter(user => {
            const lowerCaseSearch = searchTerm.toLowerCase();
            const matchesSearch = user.name.toLowerCase().includes(lowerCaseSearch) || 
                                  user.city.toLowerCase().includes(lowerCaseSearch) ||
                                  (user.state && user.state.toLowerCase().includes(lowerCaseSearch)) ||
                                  user.country.toLowerCase().includes(lowerCaseSearch) ||
                                  user.interests.some(interest => interest.toLowerCase().includes(lowerCaseSearch));
            const matchesState = stateFilter === 'All' || user.state === stateFilter;
            return matchesSearch && matchesState;
        });
    }, [searchTerm, stateFilter]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Community Directory</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Connect with fellow students and facilitators.</p>

            <div className="mt-6 flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Search by name, location, or interest..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                />
                <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                >
                    {states.map(loc => <option key={loc} value={loc}>State: {loc}</option>)}
                </select>
            </div>

            <div className="flex justify-end items-center mt-6">
                <div className="flex items-center gap-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-indigo-600' : 'text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
                        aria-label="Grid view"
                    >
                        <GridIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-indigo-600' : 'text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
                        aria-label="List view"
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="mt-4">
                {viewMode === 'grid' ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredUsers.map(user => (
                            <ProfileCard key={user.id} user={user} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredUsers.map(user => (
                            <ProfileListItem key={user.id} user={user} />
                        ))}
                    </div>
                )}
            </div>

             {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500">No members found matching your criteria.</p>
                </div>
            )}
        </div>
    </div>
  );
};