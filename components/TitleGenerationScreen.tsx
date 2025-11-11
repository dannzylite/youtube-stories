import React, { useState } from 'react';
import * as geminiService from '../services/geminiService';
import type { AnalysisData, IngestData, TitleSuggestion } from '../types';
import { AnalysisPreview } from './AnalysisPreview';
import { TitleSuggestions } from './TitleSuggestions';
import { Icon } from './Icon';

interface TitleGenerationScreenProps {
    analysis: AnalysisData;
    ingestData: IngestData;
    onTitleApproved: (approvedTitle: string, ingestData: IngestData, analysis: AnalysisData) => void;
}

export const TitleGenerationScreen: React.FC<TitleGenerationScreenProps> = ({ analysis, ingestData, onTitleApproved }) => {
    const [prompt, setPrompt] = useState('Make it more engaging for a casual audience.');
    const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([]);
    const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
    const [customTitle, setCustomTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSelectedTitle(null);
        try {
            const result = await geminiService.generateTitleSuggestions(
                analysis,
                ingestData.transcript,
                ingestData.title,
                prompt
            );
            setSuggestions(result);
            if(result.length > 0) {
              setSelectedTitle(result[0].title);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to generate titles. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCustomTitleSubmit = () => {
        if (!customTitle.trim()) return;
        onTitleApproved(customTitle.trim(), ingestData, analysis);
    };

    return (
        <div className="space-y-8">
            <AnalysisPreview analysis={analysis} />
            
             <div className="space-y-4 bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold text-white">Use Your Own Title</h3>
                <p className="text-sm text-gray-400">If you already have a title in mind, enter it here.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Enter your title..."
                        className="flex-grow bg-gray-900/80 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200 leading-relaxed px-4 py-2"
                    />
                    <button
                        onClick={handleCustomTitleSubmit}
                        disabled={!customTitle.trim()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon name="check" className="h-5 w-5" />
                        <span>Use This Title & Continue</span>
                    </button>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-gray-900 px-3 text-base font-medium text-gray-400">OR</span>
                </div>
            </div>


            <div className="space-y-6 bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                 <h3 className="text-xl font-bold text-white">Generate New Title Suggestions</h3>
                 <form onSubmit={handleGenerate} className="space-y-4">
                     <label htmlFor="title-prompt" className="block text-sm font-medium text-gray-300">
                         Your Creative Direction
                     </label>
                     <textarea
                        id="title-prompt"
                        rows={3}
                        className="w-full bg-gray-900/80 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200 leading-relaxed px-4 py-2"
                        placeholder="e.g., Make it mysterious, focus on the conflict, target a younger audience..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <div className="flex justify-end">
                         <button
                            type="submit"
                            disabled={isLoading || !prompt}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isLoading ? <Icon name="loader" className="animate-spin h-5 w-5" /> : <Icon name="logo" className="h-5 w-5" />}
                            <span>{suggestions.length > 0 ? 'Regenerate Titles' : 'Generate Titles'}</span>
                        </button>
                    </div>
                 </form>

                 {error && <div className="text-red-400 text-center">{error}</div>}

                 {isLoading && suggestions.length === 0 && (
                     <div className="text-center py-8">
                         <Icon name="loader" className="animate-spin h-6 w-6 mx-auto text-indigo-400" />
                         <p className="mt-2 text-gray-400">Generating suggestions...</p>
                     </div>
                 )}

                 {suggestions.length > 0 && (
                     <TitleSuggestions
                        suggestions={suggestions}
                        selectedTitle={selectedTitle}
                        onSelect={setSelectedTitle}
                     />
                 )}
            </div>

            {suggestions.length > 0 && (
                <div className="pt-8 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={() => selectedTitle && onTitleApproved(selectedTitle, ingestData, analysis)}
                        disabled={!selectedTitle}
                        className="inline-flex items-center gap-3 px-6 py-3 text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon name="check" className="h-5 w-5" />
                        <span>Approve Selected Title & Continue</span>
                    </button>
                </div>
            )}
        </div>
    );
};