import React, { useState } from 'react';
import type { IngestData } from '../types';
import { TRANSCRIPT_MIN_LENGTH, TRANSCRIPT_MAX_LENGTH, SUPPORTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '../constants';
import { Icon } from './Icon';

interface IngestFormProps {
    onAnalysisStart: (data: IngestData) => void;
    isLoading: boolean;
}

export const IngestForm: React.FC<IngestFormProps> = ({ onAnalysisStart, isLoading }) => {
    const [title, setTitle] = useState('');
    const [transcript, setTranscript] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [skipToVoice, setSkipToVoice] = useState(false);

    const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTranscript(e.target.value);
        if (error) setError('');
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
                setError(`Unsupported image type. Please use ${SUPPORTED_IMAGE_TYPES.join(', ')}.`);
                return;
            }
            if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                setError(`Image is too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`);
                return;
            }
            setImageFile(file);
            setImageDataUrl(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        if (imageDataUrl) {
            URL.revokeObjectURL(imageDataUrl);
            setImageDataUrl(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (skipToVoice) {
            // For voice-only mode, title becomes the story title and transcript is the story text
            if (!title.trim()) {
                setError('Please enter a title for your story.');
                return;
            }
            if (transcript.length < TRANSCRIPT_MIN_LENGTH) {
                setError(`Story text is too short. Minimum length is ${TRANSCRIPT_MIN_LENGTH} characters.`);
                return;
            }
            if (transcript.length > TRANSCRIPT_MAX_LENGTH) {
                setError(`Story text is too long. Maximum length is ${TRANSCRIPT_MAX_LENGTH} characters.`);
                return;
            }
        } else {
            // Original validation for competitor analysis mode
            if (!title.trim()) {
                setError('Please enter the competitor\'s title.');
                return;
            }
            if (transcript.length < TRANSCRIPT_MIN_LENGTH) {
                setError(`Transcript is too short. Minimum length is ${TRANSCRIPT_MIN_LENGTH} characters.`);
                return;
            }
            if (transcript.length > TRANSCRIPT_MAX_LENGTH) {
                setError(`Transcript is too long. Maximum length is ${TRANSCRIPT_MAX_LENGTH} characters.`);
                return;
            }
        }

        onAnalysisStart({ title: title.trim(), transcript, imageFile, imageDataUrl, skipToVoice });
    };

    const transcriptLength = transcript.trim().length;
    const isSubmitDisabled = isLoading || !title.trim() || transcriptLength < TRANSCRIPT_MIN_LENGTH || transcriptLength > TRANSCRIPT_MAX_LENGTH;

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                    {skipToVoice ? 'Generate Voice from Your Story' : 'Analyze Competitor Assets'}
                </h2>
                <p className="mt-4 text-lg text-gray-400">
                    {skipToVoice
                        ? 'Already have your story? Paste it below to generate voice-over directly.'
                        : 'Provide the competitor\'s title, transcript, and thumbnail to get started.'}
                </p>
            </div>

            {/* Mode Toggle */}
            <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-4">
                <label className="flex items-center justify-center gap-3 cursor-pointer">
                    <span className="text-sm font-medium text-gray-300">Competitor Analysis Mode</span>
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={skipToVoice}
                            onChange={(e) => setSkipToVoice(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-300">Quick Voice Generation</span>
                </label>
                <p className="text-xs text-gray-500 text-center mt-2">
                    {skipToVoice
                        ? 'Skip story generation and go directly to voice creation'
                        : 'Analyze competitor content to generate new stories'}
                </p>
            </div>

            {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md text-center">{error}</div>}

            <div className="space-y-4">
                <label htmlFor="title" className="block text-lg font-semibold text-white">
                    {skipToVoice ? 'Story Title' : 'Competitor\'s Title'}
                </label>
                <input
                    id="title"
                    type="text"
                    className="w-full bg-gray-900/80 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200 leading-relaxed px-4 py-2"
                    placeholder={skipToVoice ? "Enter your story title..." : "Enter the original title here..."}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-4">
                <label htmlFor="transcript" className="block text-lg font-semibold text-white">
                    {skipToVoice ? 'Your Story Text' : 'Competitor\'s Transcript'}
                </label>
                <textarea
                    id="transcript"
                    rows={15}
                    maxLength={TRANSCRIPT_MAX_LENGTH}
                    className="w-full bg-gray-900/80 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200 leading-relaxed px-4 py-2"
                    placeholder={skipToVoice ? "Paste your complete story here..." : "Paste the story transcript here..."}
                    value={transcript}
                    onChange={handleTranscriptChange}
                />
                <p className="text-sm text-gray-500 text-right">
                    {transcriptLength.toLocaleString()} / {TRANSCRIPT_MAX_LENGTH.toLocaleString()} characters
                    {transcriptLength > TRANSCRIPT_MAX_LENGTH * 0.9 && (
                        <span className={transcriptLength > TRANSCRIPT_MAX_LENGTH * 0.95 ? 'text-red-400 ml-2' : 'text-yellow-400 ml-2'}>
                            ({(TRANSCRIPT_MAX_LENGTH - transcriptLength).toLocaleString()} remaining)
                        </span>
                    )}
                </p>
            </div>

            {!skipToVoice && (
                <div className="space-y-4">
                    <label htmlFor="image-upload" className="block text-lg font-semibold text-white">
                        Competitor's Thumbnail (Optional)
                    </label>
                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-600 px-6 py-10">
                    {imageDataUrl ? (
                        <div className="relative group">
                            <img src={imageDataUrl} alt="Preview" className="mx-auto h-48 w-auto rounded-md" />
                            <button onClick={handleRemoveImage} type="button" className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <Icon name="image" className="mx-auto h-12 w-12 text-gray-500" />
                            <div className="mt-4 flex text-sm leading-6 text-gray-400">
                                <label htmlFor="image-upload" className="relative cursor-pointer rounded-md font-semibold text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-indigo-300">
                                    <span>Upload a file</span>
                                    <input id="image-upload" name="image-upload" type="file" className="sr-only" onChange={handleImageChange} accept={SUPPORTED_IMAGE_TYPES.join(',')} />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs leading-5 text-gray-500">PNG, JPG, WEBP up to {MAX_IMAGE_SIZE_MB}MB</p>
                        </div>
                    )}
                </div>
                </div>
            )}

            <div className="pt-5">
                <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Icon name="loader" className="animate-spin h-5 w-5" /> : <Icon name="logo" className="h-5 w-5" />}
                    <span>{isLoading
                        ? (skipToVoice ? 'Processing...' : 'Analyzing...')
                        : (skipToVoice ? 'Continue to Voice Generation' : 'Analyze & Continue')
                    }</span>
                </button>
            </div>
        </form>
    );
};