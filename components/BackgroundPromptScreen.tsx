import React, { useState } from 'react';
import { Icon } from './Icon';

interface BackgroundPromptScreenProps {
    approvedTitle: string;
    onGenerateBackgrounds: (prompt: string) => void;
    isLoading: boolean;
}

export const BackgroundPromptScreen: React.FC<BackgroundPromptScreenProps> = ({ approvedTitle, onGenerateBackgrounds, isLoading }) => {
    const [prompt, setPrompt] = useState('Start with a moment of quiet reflection before the main action begins.');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerateBackgrounds(prompt);
    };

    return (
        <div className="space-y-8">
             <div className="text-center">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">Craft the Background Story</h2>
                <p className="mt-4 text-lg text-gray-400">Provide a prompt to guide the AI in writing the background and synopsis.</p>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-2">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Approved Title</p>
                <p className="text-xl font-bold text-white">{approvedTitle}</p>
            </div>

            <div className="space-y-6 bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <label htmlFor="background-prompt" className="block text-lg font-semibold text-white">
                        Your Creative Direction for the Background
                    </label>
                    <textarea
                        id="background-prompt"
                        rows={4}
                        className="w-full bg-gray-900/80 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200 leading-relaxed px-4 py-2"
                        placeholder="e.g., Describe the setting in more detail, focus on the character's internal conflict..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        required
                    />
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={!prompt.trim() || isLoading}
                            className="inline-flex items-center gap-3 px-6 py-3 text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Icon name="loader" className="animate-spin h-5 w-5"/> : <Icon name="logo" className="h-5 w-5" />}
                            <span>{isLoading ? 'Generating...' : 'Generate Backgrounds'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};