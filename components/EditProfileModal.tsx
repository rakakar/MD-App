import React, { useState } from 'react';
import { User } from '../types';
import { XIcon } from './icons';

interface EditProfileModalProps {
    user: User;
    onSave: (updatedUser: User) => void;
    onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onSave, onClose }) => {
    const [formData, setFormData] = useState<User>(user);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInterestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, interests: e.target.value.split(',').map(s => s.trim()) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit Profile</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="city" className="block text-sm font-medium text-slate-700 dark:text-slate-300">City</label>
                            <input type="text" name="city" id="city" value={formData.city} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                        </div>
                         <div>
                            <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country</label>
                            <input type="text" name="country" id="country" value={formData.country} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="studyLevel" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Study Level</label>
                        <select name="studyLevel" id="studyLevel" value={formData.studyLevel} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600">
                            <option>Foundation</option>
                            <option>Reflection</option>
                            <option>Exploration</option>
                            <option>Integration</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
                        <textarea name="bio" id="bio" value={formData.bio} onChange={handleChange} rows={4} className="mt-1 w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"></textarea>
                    </div>
                     <div>
                        <label htmlFor="interests" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Interests (comma separated)</label>
                        <input type="text" name="interests" id="interests" value={formData.interests.join(', ')} onChange={handleInterestsChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                </form>
                 <div className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg mr-2">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Save Changes</button>
                </div>
            </div>
        </div>
    );
};
