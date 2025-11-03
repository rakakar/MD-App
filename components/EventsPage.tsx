import React, { useState, useMemo } from 'react';
import { MOCK_EVENTS } from '../constants';
import { EventCard } from './EventCard';
import { FilterIcon, XIcon } from './icons';

type FilterCategory = 'category' | 'location' | 'language' | 'organizer';

const filterTabs: { id: FilterCategory; label: string }[] = [
    { id: 'category', label: 'Shivr Category' },
    { id: 'location', label: 'Location' },
    { id: 'language', label: 'Language' },
    { id: 'organizer', label: 'Prabodhak' },
];

export const EventsPage: React.FC = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeFilterTab, setActiveFilterTab] = useState<FilterCategory>('category');

    const initialFilters = { category: [], location: [], language: [], organizer: [] };
    const [tempFilters, setTempFilters] = useState<Record<FilterCategory, string[]>>(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState<Record<FilterCategory, string[]>>(initialFilters);

    const filterOptions = useMemo(() => ({
        category: [...new Set(MOCK_EVENTS.map(e => e.category))],
        location: [...new Set(MOCK_EVENTS.map(e => e.location))],
        language: [...new Set(MOCK_EVENTS.map(e => e.language))],
        organizer: [...new Set(MOCK_EVENTS.map(e => e.organizer))],
    }), []);
    
    const filteredEvents = useMemo(() => {
        return MOCK_EVENTS.filter(event => {
            const matchesCategory = appliedFilters.category.length === 0 || appliedFilters.category.includes(event.category);
            const matchesLocation = appliedFilters.location.length === 0 || appliedFilters.location.includes(event.location);
            const matchesLanguage = appliedFilters.language.length === 0 || appliedFilters.language.includes(event.language);
            const matchesOrganizer = appliedFilters.organizer.length === 0 || appliedFilters.organizer.includes(event.organizer);
            return matchesCategory && matchesLocation && matchesLanguage && matchesOrganizer;
        });
    }, [appliedFilters]);

    const activeFilterCount = useMemo(() => {
      // FIX: Explicitly type `arr` as string[] to resolve a TypeScript inference issue where it was being treated as 'unknown'.
      return Object.values(appliedFilters).reduce((count, arr: string[]) => count + arr.length, 0);
    }, [appliedFilters]);

    const handleOpenDrawer = () => {
        setTempFilters(appliedFilters);
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => setIsDrawerOpen(false);

    const handleCheckboxChange = (category: FilterCategory, value: string) => {
        setTempFilters(prev => {
            const currentValues = prev[category];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            return { ...prev, [category]: newValues };
        });
    };

    const handleApplyFilters = () => {
        setAppliedFilters(tempFilters);
        handleCloseDrawer();
    };

    const handleClearAll = () => {
      setTempFilters(initialFilters);
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Events & Courses</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">Join workshops, study groups, and community gatherings.</p>

                <div className="mt-8">
                    <button
                        onClick={handleOpenDrawer}
                        className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <FilterIcon className="w-5 h-5 mr-2" />
                        Filters
                        {activeFilterCount > 0 && (
                          <span className="ml-2 bg-indigo-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{activeFilterCount}</span>
                        )}
                    </button>
                </div>
                
                <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden={!isDrawerOpen}>
                    <div className="absolute inset-0 bg-black/60" onClick={handleCloseDrawer}></div>
                    <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-[#181818] text-slate-200 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-xl font-semibold">Filter by</h2>
                            <button onClick={handleCloseDrawer} className="p-2 rounded-full hover:bg-slate-700" aria-label="Close filters">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-1/3 bg-black/20 overflow-y-auto">
                                <nav className="flex flex-col">
                                    {filterTabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveFilterTab(tab.id)}
                                            className={`p-4 text-left text-sm font-semibold w-full ${activeFilterTab === tab.id ? 'bg-[#2a2d35] text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="w-2/3 p-5 overflow-y-auto">
                                <div className="space-y-4">
                                    {filterOptions[activeFilterTab].map(option => (
                                        <label key={option} className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={tempFilters[activeFilterTab].includes(option)}
                                                onChange={() => handleCheckboxChange(activeFilterTab, option)}
                                                className="h-5 w-5 rounded-md border-slate-500 bg-transparent text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                            />
                                            <span className="text-slate-300">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-700 flex justify-between items-center bg-[#181818]">
                            <button onClick={handleClearAll} className="font-semibold text-sm hover:text-white underline underline-offset-2">Clear all</button>
                            <button onClick={handleApplyFilters} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-slate-200 transition-colors">Apply</button>
                        </div>
                    </div>
                </div>

                {filteredEvents.length > 0 ? (
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredEvents.map(event => <EventCard key={event.id} event={event} />)}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-slate-500">No events found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};