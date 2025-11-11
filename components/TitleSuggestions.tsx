
import React from 'react';
import type { TitleSuggestion } from '../types';
import { Icon } from './Icon';

interface TitleSuggestionsProps {
    suggestions: TitleSuggestion[];
    selectedTitle: string | null;
    onSelect: (title: string) => void;
}

export const TitleSuggestions: React.FC<TitleSuggestionsProps> = ({ suggestions, selectedTitle, onSelect }) => {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Icon name="title" className="h-6 w-6 text-indigo-400"/>
                <span>Title Suggestions</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map(suggestion => (
                    <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => onSelect(suggestion.title)}
                        className={`p-4 rounded-lg text-left transition-all duration-200 border-2 ${selectedTitle === suggestion.title ? 'bg-indigo-900/50 border-indigo-500 ring-2 ring-indigo-500' : 'bg-gray-900/50 border-gray-700 hover:border-indigo-600'}`}
                    >
                        <p className="font-semibold text-white">{suggestion.title}</p>
                        <p className="mt-2 text-sm text-gray-400">{suggestion.reasoning}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
