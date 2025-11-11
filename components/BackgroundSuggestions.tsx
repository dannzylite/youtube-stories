
import React from 'react';
import type { BackgroundSuggestion } from '../types';
import { Icon } from './Icon';

interface BackgroundSuggestionsProps {
    suggestions: BackgroundSuggestion[];
    selectedBackground: string | null;
    onSelect: (background: string) => void;
}

export const BackgroundSuggestions: React.FC<BackgroundSuggestionsProps> = ({ suggestions, selectedBackground, onSelect }) => {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Icon name="story" className="h-6 w-6 text-indigo-400"/>
                <span>Background & Synopsis Suggestions</span>
            </h3>
            <div className="space-y-4">
                {suggestions.map(suggestion => (
                    <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => onSelect(suggestion.background)}
                        className={`w-full p-4 rounded-lg text-left transition-all duration-200 border-2 ${selectedBackground === suggestion.background ? 'bg-indigo-900/50 border-indigo-500 ring-2 ring-indigo-500' : 'bg-gray-900/50 border-gray-700 hover:border-indigo-600'}`}
                    >
                        <p className="text-sm text-gray-200">{suggestion.background}</p>
                        <p className="mt-3 text-xs text-gray-500 italic">Reasoning: {suggestion.reasoning}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
