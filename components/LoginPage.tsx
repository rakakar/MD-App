import React from 'react';
import { BookOpenIcon } from './icons';

interface LoginPageProps {
    onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
            <div className="text-center p-8">
                <BookOpenIcon className="w-16 h-16 mx-auto text-indigo-500" />
                <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    Madhyasth Darshan Community
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                    Join the community to learn and discuss.
                </p>
                <div className="mt-8">
                    <button
                        onClick={onLogin}
                        className="w-full max-w-xs px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Sign In with Google
                    </button>
                </div>
            </div>
        </div>
    );
};
