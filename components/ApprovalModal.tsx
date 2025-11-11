
import React from 'react';
import { Icon } from './Icon';

interface ApprovalModalProps {
    title: string;
    background: string;
    onApprove: () => void;
    onCancel: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ title, background, onApprove, onCancel }) => {
    const estimatedWordCount = Math.round(background.split(/\s+/).filter(Boolean).length * 2.5);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-700">
                <div className="p-6 sm:p-8">
                    <div className="flex items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-900 sm:mx-0 sm:h-10 sm:w-10">
                            <Icon name="check" className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                            <h3 className="text-xl leading-6 font-bold text-white" id="modal-title">
                                Approve to generate full story?
                            </h3>
                            <div className="mt-4 space-y-4">
                                <p className="text-sm text-gray-400">
                                    You're about to generate the full story using the selected title and background. This may consume generation quota — continue?
                                </p>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Title</p>
                                        <p className="text-base font-medium text-white">{title}</p>
                                    </div>
                                     <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Background</p>
                                        <p className="text-sm text-gray-300 line-clamp-2">{background}</p>
                                    </div>
                                    <p className="text-sm text-indigo-400">Estimated final story length: ~{estimatedWordCount} words</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800/50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onApprove}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                        Approve
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                        Edit
                    </button>
                </div>
            </div>
        </div>
    );
};
