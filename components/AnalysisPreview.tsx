
import React from 'react';
import type { AnalysisData } from '../types';
import { Icon } from './Icon';

interface AnalysisPreviewProps {
    analysis: AnalysisData;
}

const DetailItem: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start gap-4">
        <Icon name={icon} className="h-6 w-6 text-indigo-400 mt-1 flex-shrink-0" />
        <div>
            <h4 className="text-base font-semibold text-gray-300">{label}</h4>
            {children}
        </div>
    </div>
);

export const AnalysisPreview: React.FC<AnalysisPreviewProps> = ({ analysis }) => {
    return (
        <div className="space-y-6 bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white">Narrative Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <DetailItem icon="text" label="Summary">
                    <p className="text-sm text-gray-400">{analysis.summary}</p>
                </DetailItem>
                <DetailItem icon="image" label="Setting">
                    <p className="text-sm text-gray-400">{analysis.setting}</p>
                </DetailItem>
                <DetailItem icon="check" label="Key Points">
                     <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                        {analysis.keyPoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </DetailItem>
                <DetailItem icon="users" label="Characters">
                    <p className="text-sm text-gray-400">{analysis.characters.join(', ')}</p>
                </DetailItem>
                <DetailItem icon="tag" label="Themes">
                    <div className="flex flex-wrap gap-2 mt-1">
                        {analysis.themes.map((theme, i) => (
                            <span key={i} className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">{theme}</span>
                        ))}
                    </div>
                </DetailItem>
            </div>
        </div>
    );
};
