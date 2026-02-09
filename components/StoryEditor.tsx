
import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiServiceProxy';
import type { StoryVersion } from '../types';
import { Icon } from './Icon';
import { BatchImageGenerator } from './BatchImageGenerator';

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

// Gemini TTS Voices (30 premium voices)
const GEMINI_VOICES = [
    // Male Voices
    { id: 'Charon', name: 'Charon (M) - Informative & Clear', gender: 'male' },
    { id: 'Puck', name: 'Puck (M) - Upbeat & Energetic', gender: 'male' },
    { id: 'Fenrir', name: 'Fenrir (M) - Excitable & Dynamic', gender: 'male' },
    { id: 'Orus', name: 'Orus (M) - Firm & Decisive', gender: 'male' },
    { id: 'Enceladus', name: 'Enceladus (M) - Breathy & Soft', gender: 'male' },
    { id: 'Iapetus', name: 'Iapetus (M) - Clear & Articulate', gender: 'male' },
    { id: 'Algenib', name: 'Algenib (M) - Gravelly Texture', gender: 'male' },
    { id: 'Algieba', name: 'Algieba (M) - Smooth & Pleasant', gender: 'male' },
    { id: 'Alnilam', name: 'Alnilam (M) - Firm & Strong', gender: 'male' },
    { id: 'Rasalgethi', name: 'Rasalgethi (M) - Professional', gender: 'male' },
    { id: 'Sadachbia', name: 'Sadachbia (M) - Lively & Animated', gender: 'male' },
    { id: 'Sadaltager', name: 'Sadaltager (M) - Authoritative', gender: 'male' },
    { id: 'Achird', name: 'Achird (M) - Friendly & Approachable', gender: 'male' },
    { id: 'Schedar', name: 'Schedar (M) - Narrator', gender: 'male' },
    { id: 'Zubenelgenubi', name: 'Zubenelgenubi (M) - Narrator', gender: 'male' },
    { id: 'Umbriel', name: 'Umbriel (M) - Narrator', gender: 'male' },

    // Female Voices
    { id: 'Kore', name: 'Kore (F) - Firm & Confident', gender: 'female' },
    { id: 'Leda', name: 'Leda (F) - Youthful & Energetic', gender: 'female' },
    { id: 'Zephyr', name: 'Zephyr (F) - Bright & Cheerful', gender: 'female' },
    { id: 'Aoede', name: 'Aoede (F) - Smooth Narrator', gender: 'female' },
    { id: 'Callirrhoe', name: 'Callirrhoe (F) - Easy-going & Relaxed', gender: 'female' },
    { id: 'Autonoe', name: 'Autonoe (F) - Bright & Optimistic', gender: 'female' },
    { id: 'Despina', name: 'Despina (F) - Smooth & Flowing', gender: 'female' },
    { id: 'Erinome', name: 'Erinome (F) - Clear & Precise', gender: 'female' },
    { id: 'Gacrux', name: 'Gacrux (F) - Mature & Experienced', gender: 'female' },
    { id: 'Laomedeia', name: 'Laomedeia (F) - Upbeat & Lively', gender: 'female' },
    { id: 'Pulcherrima', name: 'Pulcherrima (F) - Expressive', gender: 'female' },
    { id: 'Sulafat', name: 'Sulafat (F) - Warm & Welcoming', gender: 'female' },
    { id: 'Vindemiatrix', name: 'Vindemiatrix (F) - Gentle & Kind', gender: 'female' },
    { id: 'Achernar', name: 'Achernar (F) - Soft & Gentle', gender: 'female' },
];

// Google Cloud TTS Voices - Prioritized for sleep/consistent content
const GOOGLE_CLOUD_VOICES = [
    // === CHIRP 3 HD VOICES (Best for Sleep - Realistic with breaths) ===
    // These sound human with natural breaths and softer edges
    { id: 'en-US-Chirp3-HD-Fenrir', name: '🌙 Fenrir (M) - Deep & Rumbly [KING OF SLEEP]', gender: 'male' },
    { id: 'en-US-Chirp3-HD-Charon', name: '🌙 Charon (M) - Extremely Deep & Gravelly [SPACE/DEEP]', gender: 'male' },
    { id: 'en-US-Chirp3-HD-Puck', name: '🌙 Puck (M) - Soft & Gentle [FAIRY TALES]', gender: 'male' },
    { id: 'en-US-Chirp3-HD-Kore', name: '🌙 Kore (F) - Breathy & Soft [VERY RELAXING]', gender: 'female' },
    { id: 'en-US-Chirp3-HD-Aoede', name: 'Aoede (F) - Smooth Narrator', gender: 'female' },
    { id: 'en-US-Chirp3-HD-Orus', name: 'Orus (M) - Firm & Clear', gender: 'male' },
    { id: 'en-US-Chirp3-HD-Leda', name: 'Leda (F) - Youthful (NOT for sleep)', gender: 'female' },
    { id: 'en-US-Chirp3-HD-Zephyr', name: 'Zephyr (F) - Bright & Energetic (NOT for sleep)', gender: 'female' },

    // === STUDIO VOICES (100% Consistent - More "Perfect") ===
    // Frozen voices, no variation ever
    { id: 'en-US-Studio-M', name: '⭐ Studio-M (M) - Deep & Authoritative [100% CONSISTENT]', gender: 'male' },
    { id: 'en-US-Studio-O', name: '⭐ Studio-O (F) - Warm & Calming [100% CONSISTENT]', gender: 'female' },

    // === NEURAL2 VOICES (Good Quality) ===
    { id: 'en-US-Neural2-A', name: 'Neural2-A (M) - Casual & Friendly', gender: 'male' },
    { id: 'en-US-Neural2-D', name: 'Neural2-D (M) - Clear & Professional', gender: 'male' },
    { id: 'en-US-Neural2-I', name: 'Neural2-I (M) - Deep & Authoritative', gender: 'male' },
    { id: 'en-US-Neural2-J', name: 'Neural2-J (M) - Warm & Smooth', gender: 'male' },
    { id: 'en-US-Neural2-C', name: 'Neural2-C (F) - Bright & Youthful', gender: 'female' },
    { id: 'en-US-Neural2-E', name: 'Neural2-E (F) - Clear & Energetic', gender: 'female' },
    { id: 'en-US-Neural2-F', name: 'Neural2-F (F) - Calm & Soothing', gender: 'female' },
    { id: 'en-US-Neural2-G', name: 'Neural2-G (F) - Professional & Precise', gender: 'female' },
    { id: 'en-US-Neural2-H', name: 'Neural2-H (F) - Mature & Confident', gender: 'female' },
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
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    const [progressTimer, setProgressTimer] = useState<NodeJS.Timeout | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [estimatedTotalSeconds, setEstimatedTotalSeconds] = useState(0);
    // Default to google-cloud since it's more reliable and faster
    const [ttsEngine, setTtsEngine] = useState<'gemini' | 'google-cloud'>('google-cloud');
    // Speaking rate: 0.25 (slowest) to 4.0 (fastest), 1.0 is normal
    const [speakingRate, setSpeakingRate] = useState(1.0);

    // Dynamically select voice list based on engine
    const NARRATOR_VOICES = ttsEngine === 'google-cloud' ? GOOGLE_CLOUD_VOICES : GEMINI_VOICES;
    const [selectedVoice, setSelectedVoice] = useState(NARRATOR_VOICES[0].id);
    
    useEffect(() => {
        setCurrentStory(story);
    }, [story]);

    // Reset voice selection when engine changes
    useEffect(() => {
        const voices = ttsEngine === 'google-cloud' ? GOOGLE_CLOUD_VOICES : GEMINI_VOICES;
        setSelectedVoice(voices[0].id);
    }, [ttsEngine]);

    useEffect(() => {
        if (notification && !isGeneratingSpeech) {
            const timeout = setTimeout(() => setNotification(''), 3000);
            return () => clearTimeout(timeout);
        }
    }, [notification, isGeneratingSpeech]);

    // Cleanup timer when component unmounts or generation completes
    useEffect(() => {
        return () => {
            if (progressTimer) {
                clearInterval(progressTimer);
            }
        };
    }, [progressTimer]);

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
        const voiceObj = NARRATOR_VOICES.find(v => v.id === voiceId);
        const voiceName = voiceObj?.name || 'the selected voice';
        setNotification(`Previewing ${voiceName}...`);
        try {
            // Voice ID is already correct based on selected engine
            const pcmData = await geminiService.generateSpeechPreview(voiceId, speakingRate, ttsEngine);
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
        setElapsedSeconds(0);
        setNotification('Starting audio generation...');

        console.log(`[Story Editor] Generating voice for story with ${currentStory.length} characters`);
        console.log(`[Story Editor] Story preview: ${currentStory.substring(0, 100)}...`);
        console.log(`[Story Editor] Story ending: ...${currentStory.substring(currentStory.length - 100)}`);

        try {
            const storyLength = currentStory.length;

            // Calculate estimated time based on selected TTS engine
            // Updated to match backend chunk sizes and delays
            const CHUNK_SIZE = ttsEngine === 'gemini' ? 3000 : 4000; // Gemini: 3000, Google Cloud: 4000
            const numChunks = Math.ceil(storyLength / CHUNK_SIZE);

            let secondsPerChunk: number;
            let avgDelayBetweenChunks: number;

            if (ttsEngine === 'gemini') {
                // Gemini TTS: ~15 seconds to generate + 8-11 seconds delay between chunks
                // With retry logic, estimate higher
                secondsPerChunk = 20; // Generation time
                avgDelayBetweenChunks = 9; // Average delay (8s base + progressive delays)
            } else {
                // Google Cloud TTS: ~5 seconds per chunk + 0.5s delay
                secondsPerChunk = 5;
                avgDelayBetweenChunks = 0.5;
            }

            const estimatedSeconds = (numChunks * secondsPerChunk) + ((numChunks - 1) * avgDelayBetweenChunks);

            setEstimatedTotalSeconds(estimatedSeconds);

            const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
            console.log(`[Story Editor] Estimated generation time: ${estimatedMinutes} minutes for ${storyLength} characters (${numChunks} chunks)`);

            // Start progress timer
            const timer = setInterval(() => {
                setElapsedSeconds((prev: number) => {
                    const newElapsed = prev + 1;
                    const remainingSeconds = Math.max(0, estimatedSeconds - newElapsed);
                    const remainingMinutes = Math.floor(remainingSeconds / 60);
                    const remainingSecondsDisplay = remainingSeconds % 60;
                    const elapsedMinutes = Math.floor(newElapsed / 60);
                    const elapsedSecondsDisplay = newElapsed % 60;
                    const progressPercent = Math.min(100, Math.floor((newElapsed / estimatedSeconds) * 100));

                    const engineName = ttsEngine === 'gemini' ? 'Gemini TTS' : 'Google Cloud TTS';

                    if (storyLength > 20000) {
                        setNotification(
                            `Generating audio with ${engineName} (${storyLength.toLocaleString()} chars, ${numChunks} chunks)...\n` +
                            `Progress: ${progressPercent}% | ` +
                            `Elapsed: ${elapsedMinutes}:${elapsedSecondsDisplay.toString().padStart(2, '0')} | ` +
                            `Remaining: ~${remainingMinutes}:${remainingSecondsDisplay.toString().padStart(2, '0')}`
                        );
                    } else {
                        setNotification(
                            `Generating audio with ${engineName} (${numChunks} chunks)...\n` +
                            `Elapsed: ${elapsedMinutes}:${elapsedSecondsDisplay.toString().padStart(2, '0')} | ` +
                            `Remaining: ~${remainingMinutes}:${remainingSecondsDisplay.toString().padStart(2, '0')}`
                        );
                    }

                    return newElapsed;
                });
            }, 1000);
            setProgressTimer(timer);

            // Use the selected TTS engine for long audio synthesis
            // Voice ID is already correct based on selected engine
            const pcmData = await geminiService.generateLongAudio(currentStory, selectedVoice, ttsEngine, speakingRate);

            // Clear the timer
            clearInterval(timer);
            setProgressTimer(null);

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

        } catch (error: any) {
            console.error("Failed to generate speech", error);

            // Clear the timer on error
            if (progressTimer) {
                clearInterval(progressTimer);
                setProgressTimer(null);
            }

            // Check if it's a configuration error (missing service account, GCS bucket, etc.)
            if (error?.message?.includes('GCS_BUCKET_NAME') ||
                error?.message?.includes('GCP_PROJECT_ID') ||
                error?.message?.includes('ENOENT') ||
                error?.message?.includes('service-account-key') ||
                error?.message?.includes('PERMISSION_DENIED')) {
                setNotification('Long audio synthesis not configured. Using chunked generation...');

                // Fallback to old method if GCS is not configured
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

                    setNotification('Audio downloaded successfully (using fallback method)!');
                } catch (fallbackError) {
                    console.error("Fallback audio generation also failed", fallbackError);
                    setNotification('Failed to generate audio. Please try again.');
                }
            } else {
                setNotification('Failed to generate audio. Please try again.');
            }
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
                    maxLength={200000}
                    className="w-full bg-gray-900/80 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200 leading-relaxed px-4 py-2"
                />
                <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                    <span>Character count: {currentStory.length.toLocaleString()} / 200,000</span>
                    <span className={currentStory.length > 180000 ? 'text-yellow-400' : currentStory.length > 195000 ? 'text-red-400' : ''}>
                        {currentStory.length > 180000 && `${(200000 - currentStory.length).toLocaleString()} characters remaining`}
                    </span>
                </div>
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
                        {/* TTS Engine Selector */}
                        <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-md border border-gray-600">
                            <label className="text-sm font-medium text-gray-300">Engine:</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setTtsEngine('gemini')}
                                    disabled={isGeneratingSpeech}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                        ttsEngine === 'gemini'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className="flex flex-col items-start">
                                        <span>Gemini TTS</span>
                                        <span className="text-xs opacity-75">Premium voices, slower</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setTtsEngine('google-cloud')}
                                    disabled={isGeneratingSpeech}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                        ttsEngine === 'google-cloud'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className="flex flex-col items-start">
                                        <span>Google Cloud TTS</span>
                                        <span className="text-xs opacity-75">Fast, 3x quicker</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Speed Control - Only works with Google Cloud TTS */}
                        <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-md border border-gray-600">
                            <label htmlFor="speed-slider" className="text-sm font-medium text-gray-300 whitespace-nowrap">
                                Speed: <span className="text-white font-bold">{speakingRate.toFixed(2)}x</span>
                                {ttsEngine === 'gemini' && (
                                    <span className="ml-2 text-xs text-yellow-400">(Google Cloud only)</span>
                                )}
                            </label>
                            <input
                                id="speed-slider"
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.05"
                                value={speakingRate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeakingRate(parseFloat(e.target.value))}
                                disabled={isGeneratingSpeech || isPreviewing || ttsEngine === 'gemini'}
                                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Adjust speaking rate"
                            />
                            <div className="flex gap-2 text-xs text-gray-400">
                                <span>0.5x</span>
                                <span>→</span>
                                <span>2.0x</span>
                            </div>
                        </div>

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

                        {/* Progress indicator */}
                        {isGeneratingSpeech && estimatedTotalSeconds > 0 && (
                            <div className="space-y-2">
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-teal-500 h-full transition-all duration-1000 ease-linear"
                                        style={{ width: `${Math.min(100, (elapsedSeconds / estimatedTotalSeconds) * 100)}%` }}
                                    />
                                </div>
                                <div className="text-sm text-gray-300 font-mono">
                                    <div className="flex justify-between">
                                        <span>Progress: {Math.min(100, Math.floor((elapsedSeconds / estimatedTotalSeconds) * 100))}%</span>
                                        <span>
                                            {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')} /
                                            ~{Math.floor(estimatedTotalSeconds / 60)}:{(estimatedTotalSeconds % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Time remaining: ~{Math.floor(Math.max(0, estimatedTotalSeconds - elapsedSeconds) / 60)}:
                                        {(Math.max(0, estimatedTotalSeconds - elapsedSeconds) % 60).toString().padStart(2, '0')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Batch Image Generation Section - Only show when story is complete */}
                {isStoryComplete && (
                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <BatchImageGenerator story={currentStory} title={title} />
                    </div>
                )}
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