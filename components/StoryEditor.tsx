
import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiServiceProxy';
import type { StoryVersion } from '../types';
import { Icon } from './Icon';

interface StoryEditorProps {
    title: string;
    background: string;
    story: string;
    thumbnailUrl: string;
    transcript: string;
    onSaveVersion: (data: { title: string, background: string, story: string }) => void;
    onEdit: () => void;
    onContinue: (prompt: string, existingStory: string) => void;
    isGenerating: boolean;
    isStoryComplete: boolean;
    onProceedToAssets: () => void;
}

const NARRATOR_VOICES = [
    { id: 'Charon', name: 'Deep Narrator' },
    { id: 'Fenrir', name: 'Gravelly Storyteller' },
    { id: 'Puck', name: 'Authoritative Voice' },
    { id: 'Zephyr', name: 'Calm Chronicler' },
    { id: 'Kore', name: 'Eloquent Orator' },
];

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function createWavBlob(pcmData: Uint8Array): Blob {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = pcmData.length;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size for PCM
    view.setUint16(20, 1, true); // AudioFormat (PCM=1)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    new Uint8Array(buffer).set(pcmData, 44);

    return new Blob([view], { type: 'audio/wav' });
}


export const StoryEditor: React.FC<StoryEditorProps> = ({ title, background, story, thumbnailUrl, transcript, onSaveVersion, onEdit, onContinue, isGenerating, isStoryComplete, onProceedToAssets }) => {
    const [currentStory, setCurrentStory] = useState(story);
    const [history, setHistory] = useState<string[]>([story]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [versions, setVersions] = useState<StoryVersion[]>([]);
    const [notification, setNotification] = useState('');
    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
    const [speechGenerationProgress, setSpeechGenerationProgress] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('Charon');
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    
    useEffect(() => {
        setCurrentStory(story);
    }, [story]);

    useEffect(() => {
        if (notification) {
            const timeout = setTimeout(() => setNotification(''), 3000);
            return () => clearTimeout(timeout);
        }
    }, [notification]);

    const handleStoryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setCurrentStory(newValue);
        
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newValue);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setCurrentStory(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setCurrentStory(history[historyIndex + 1]);
        }
    };
    
    const handleSave = () => {
        const versionData = { title, background, story: currentStory };
        onSaveVersion(versionData);
        setVersions(prev => [{...versionData, id: Date.now(), createdAt: new Date().toISOString()}, ...prev]);
        setNotification('Version saved successfully!');
    };
    
    const handleContinue = () => {
        const lastFragment = currentStory.slice(-500); // Get last 500 chars for context
        const continuePrompt = `Please continue from where the story left off, using this last fragment for context: "${lastFragment}". This is the second and final part. Write a satisfying conclusion to the entire narrative.`;
        onContinue(continuePrompt, currentStory);
    };
    
    const playPcmAudio = async (pcmData: Uint8Array) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const frameCount = pcmData.length / 2; // Each sample is 2 bytes (16-bit)
            const audioBuffer = audioContext.createBuffer(1, frameCount, 24000);
            const channelData = audioBuffer.getChannelData(0);
            
            const pcm16 = new Int16Array(pcmData.buffer);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = pcm16[i] / 32768.0;
            }
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();

            source.onended = () => {
                audioContext.close().catch(console.error);
            };
        } catch (error) {
            console.error("Failed to play audio:", error);
            setNotification("Could not play audio preview.");
        }
    };

    const handlePreviewVoice = async (voiceId: string) => {
        setIsPreviewing(true);
        const voiceName = NARRATOR_VOICES.find(v => v.id === voiceId)?.name || 'the selected voice';
        setNotification(`Previewing ${voiceName}...`);
        try {
            const pcmData = await geminiService.generateSpeechPreview(voiceId);
            await playPcmAudio(pcmData);
        } catch (error) {
            console.error("Failed to generate voice preview", error);
            setNotification('Failed to generate preview. Please try again.');
        } finally {
            setIsPreviewing(false);
            setNotification('');
        }
    };

    const handleTextToSpeech = async () => {
        setIsGeneratingSpeech(true);
        setSpeechGenerationProgress('');
        setNotification('Starting audio generation...');
        try {
            const onProgress = (current: number, total: number) => {
                const progressText = `Generating audio... (${current}/${total})`;
                setSpeechGenerationProgress(progressText);
                setNotification(progressText);
            };

            const pcmData = await geminiService.generateSpeechFromLongText(currentStory, selectedVoice, onProgress);

            const wavBlob = createWavBlob(pcmData);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            a.download = `story_audio_${timestamp}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setNotification('Audio downloaded successfully!');

        } catch (error) {
            console.error("Failed to generate speech", error);
            setNotification('Failed to generate audio. Please try again.');
        } finally {
            setIsGeneratingSpeech(false);
            setSpeechGenerationProgress('');
        }
    };

    const downloadFile = (filename: string, content: string, type: string) => {
        const element = document.createElement("a");
        const file = new Blob([content], {type});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };
    
    const handleExport = (format: 'json' | 'md' | 'csv') => {
        const data = { title, thumbnailUrl, transcript, story: currentStory };
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        
        if (format === 'json') {
            downloadFile(`story_${timestamp}.json`, JSON.stringify(data, null, 2), 'application/json');
        } else if (format === 'md') {
            const content = `# ${title}\n\n![Thumbnail](${thumbnailUrl})\n\n## Story\n\n${currentStory}\n\n---\n\n## Original Transcript\n\n${transcript}`;
            downloadFile(`story_${timestamp}.md`, content, 'text/markdown');
        } else if (format === 'csv') {
            const headers = "title,thumbnailUrl,story,transcript";
            const row = `"${title.replace(/"/g, '""')}","${thumbnailUrl}","${currentStory.replace(/"/g, '""')}","${transcript.replace(/"/g, '""')}"`;
            const content = `${headers}\n${row}`;
            downloadFile(`story_${timestamp}.csv`, content, 'text/csv');
        }
        setNotification(`Exported as ${format.toUpperCase()}!`);
    };

    return (
        <div className="space-y-8">
            {notification && (
                <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-2 rounded-md text-center">
                    {notification}
                </div>
            )}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Final Story</h2>
                <button onClick={onEdit} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
                    <Icon name="edit" className="h-4 w-4" />
                    <span>Back to Edit Suggestions</span>
                </button>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                 {isStoryComplete && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-green-300 bg-green-900/50 rounded-full">
                        <Icon name="check" className="h-4 w-4" />
                        Complete
                    </span>
                )}
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                     <label htmlFor="story-editor" className="block text-lg font-semibold text-white">
                        Story Editor
                    </label>
                    <div className="flex items-center space-x-2">
                        <button onClick={undo} disabled={historyIndex === 0} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                           <Icon name="undo" className="h-5 w-5" />
                        </button>
                         <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                           <Icon name="redo" className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <textarea
                    id="story-editor"
                    value={currentStory}
                    onChange={handleStoryChange}
                    rows={20}
                    className="w-full bg-gray-900/80 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200 leading-relaxed px-4 py-2"
                />
            </div>
            
            <div className="pt-8 border-t border-gray-700 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                            <Icon name="save" className="h-4 w-4"/>
                            Save Version
                        </button>
                        {!isStoryComplete ? (
                             <button 
                                onClick={handleContinue} 
                                disabled={isGenerating || isStoryComplete}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? <Icon name="loader" className="animate-spin h-4 w-4"/> : <Icon name="logo" className="h-4 w-4" />}
                                {isGenerating ? 'Generating...' : 'Continue Generating'}
                            </button>
                        ) : (
                             <button 
                                onClick={onProceedToAssets}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                                <Icon name="youtube" className="h-5 w-5"/>
                                <span>Generate YouTube Assets</span>
                            </button>
                        )}
                    </div>
                     <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-300">Export as:</span>
                        <button onClick={() => handleExport('json')} className="px-3 py-1 text-sm bg-gray-700 rounded-md hover:bg-gray-600">JSON</button>
                        <button onClick={() => handleExport('md')} className="px-3 py-1 text-sm bg-gray-700 rounded-md hover:bg-gray-600">MD</button>
                        <button onClick={() => handleExport('csv')} className="px-3 py-1 text-sm bg-gray-700 rounded-md hover:bg-gray-600">CSV</button>
                    </div>
                </div>

                <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <h4 className="text-base font-semibold text-white">Audio Generation</h4>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label htmlFor="voice-select" className="text-sm font-medium text-gray-300">Voice:</label>
                                <select
                                    id="voice-select"
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    disabled={isGeneratingSpeech || isPreviewing}
                                    className="bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm text-white px-3 py-2 disabled:opacity-50"
                                    aria-label="Select narrator voice"
                                >
                                    {NARRATOR_VOICES.map(voice => (
                                        <option key={voice.id} value={voice.id}>{voice.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => handlePreviewVoice(selectedVoice)}
                                disabled={isGeneratingSpeech || isPreviewing}
                                className="p-2.5 text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Preview Voice"
                            >
                                {isPreviewing ? 
                                    <Icon name="loader" className="animate-spin h-4 w-4"/> : 
                                    <Icon name="play" className="h-4 w-4" />
                                }
                            </button>
                        </div>
                         <button 
                            onClick={handleTextToSpeech} 
                            disabled={isGeneratingSpeech || isPreviewing || !currentStory.trim()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingSpeech ? <Icon name="loader" className="animate-spin h-4 w-4"/> : <Icon name="tts" className="h-4 w-4" />}
                            <span>{speechGenerationProgress || (isGeneratingSpeech ? 'Generating...' : 'Generate Audio')}</span>
                        </button>
                    </div>
                </div>
            </div>
            
             {versions.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Version History</h3>
                    <ul className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-h-60 overflow-y-auto space-y-2">
                        {versions.map(v => (
                            <li key={v.id} className="p-3 bg-gray-800 rounded-md">
                                <p className="font-semibold text-white truncate">{v.title}</p>
                                <p className="text-xs text-gray-400">Saved on {new Date(v.createdAt).toLocaleString()}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};