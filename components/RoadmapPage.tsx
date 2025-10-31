import React from 'react';
import { MOCK_ROADMAP } from '../constants';
import { RoadmapLevel, RoadmapStep } from '../types';
import { BookOpenIcon, VideoIcon, FeatherIcon, ClipboardListIcon } from './icons';

const stepIcons: { [key in RoadmapStep['type']]: React.ElementType } = {
    reading: BookOpenIcon,
    video: VideoIcon,
    reflection: FeatherIcon,
    activity: ClipboardListIcon,
};

const RoadmapLevelCard: React.FC<{ level: RoadmapLevel, levelIndex: number }> = ({ level, levelIndex }) => {
    return (
        <div className="relative pl-8">
            <div className="absolute left-0 top-0 h-full w-px bg-slate-300 dark:bg-slate-600"></div>
            <div className="absolute left-[-9px] top-1 w-5 h-5 bg-indigo-600 rounded-full border-4 border-slate-50 dark:border-slate-900"></div>
            <div className="mb-12">
                <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                   {level.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-semibold">{level.subtitle}</p>
                <div className="mt-4 space-y-4">
                    {level.steps.map(step => {
                        const Icon = stepIcons[step.type];
                        return (
                            <div key={step.id} className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 mr-4 mt-1">
                                       <Icon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{step.title}</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{step.description}</p>
                                        {step.link && <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">View Resource &rarr;</a>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

export const RoadmapPage: React.FC = () => {
  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Systematic Study Roadmap</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">A suggested path for study and self-exploration toward understanding of Coexistence.</p>

            <div className="mt-8">
                {MOCK_ROADMAP.map((level, index) => (
                    <RoadmapLevelCard key={level.id} level={level} levelIndex={index} />
                ))}
            </div>
        </div>
    </div>
  );
};