import React from 'react';
import type { BackgroundSuggestion } from '../types';
import { BackgroundSuggestions } from './BackgroundSuggestions';
import { Icon } from './Icon';

interface RewriteSuggestionsProps {
    backgroundSuggestions: BackgroundSuggestion[];
    selectedBackground: string | null;
    onBackgroundSelect: (background: string) => void;
    onApprove: () => void;
    isGeneratingStory: boolean;
    isLoadingSuggestions: boolean;
}

export const RewriteSuggestions: React.FC<RewriteSuggestionsProps> = ({
    backgroundSuggestions,
    selectedBackground,
    onBackgroundSelect,
    onApprove,
    isGeneratingStory,
    isLoadingSuggestions
}) => {
    const canApprove = selectedBackground && !isGeneratingStory && !isLoadingSuggestions;

    if (isLoadingSuggestions) {
        return (
            <div className="text-center py-10">
                <Icon name="loader" className="animate-spin h-8 w-8 text-indigo-400 mx-auto" />
                <p className="mt-4 text-lg text-gray-400">Generating background stories...</p>
            </div>
        )
    }

    return (
        <div className="space-y-12">
            <BackgroundSuggestions 
                suggestions={backgroundSuggestions}
                selectedBackground={selectedBackground}
                onSelect={onBackgroundSelect}
            />
            <div className="pt-8 border-t border-gray-700 flex justify-end">
                <button
                    onClick={onApprove}
                    disabled={!canApprove}
                    className="inline-flex items-center gap-3 px-6 py-3 text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGeneratingStory ? <Icon name="loader" className="animate-spin h-5 w-5" /> : <Icon name="logo" className="h-5 w-5" />}
                    <span>{isGeneratingStory ? 'Generating...' : 'Approve & Generate Full Story'}</span>
                </button>
            </div>
        </div>
    );
};