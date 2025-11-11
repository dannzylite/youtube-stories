import React, { useState } from 'react';
import { Icon } from './Icon';

interface StoryPromptScreenProps {
    approvedTitle: string;
    approvedBackground: string;
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
}

const defaultPrompt = `You are a master storyteller. Using the provided title and background, write the first part of the full story.

Your writing should be engaging, establish the main characters and setting clearly, and build narrative tension. End this first part at a natural break or a point of suspense that makes the reader eager to find out what happens next.

This is the first of two parts.`;

export const StoryPromptScreen: React.FC<StoryPromptScreenProps> = ({ approvedTitle, approvedBackground, onGenerate, isLoading }) => {
    const [prompt, setPrompt] = useState(defaultPrompt);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(prompt);
    };

    return (
        <div className="space-y-8">
             <div className="text-center">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">Final Story Prompt</h2>
                <p className="mt-4 text-lg text-gray-400">This is your final chance to guide the AI. Use this prompt to shape the full story.</p>
            </div>

            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 space-y-4">
                 <div>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Approved Title</p>
                    <p className="text-xl font-bold text-white">{approvedTitle}</p>
                </div>
                 <div>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Approved Background</p>
                    <p className="text-base text-gray-300">{approvedBackground}</p>
                </div>
            </div>

            <div className="space-y-6 bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <label htmlFor="story-prompt" className="block text-lg font-semibold text-white">
                        Creative Direction for the Full Story
                    </label>
                    <textarea
                        id="story-prompt"
                        rows={8}
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
                            className="inline-flex items-center gap-3 px-6 py-3 text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Icon name="loader" className="animate-spin h-5 w-5"/> : <Icon name="logo" className="h-5 w-5" />}
                            <span>{isLoading ? 'Generating...' : 'Generate Story (Part 1)'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};