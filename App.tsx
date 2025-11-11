import React, { useState, useCallback, useEffect } from 'react';
import { IngestForm } from './components/IngestForm';
import { TitleGenerationScreen } from './components/TitleGenerationScreen';
import { BackgroundPromptScreen } from './components/BackgroundPromptScreen';
import { RewriteSuggestions } from './components/RewriteSuggestions';
import { ApprovalModal } from './components/ApprovalModal';
import { StoryEditor } from './components/StoryEditor';
import { StoryPromptScreen } from './components/StoryPromptScreen';
import { YouTubeAssetsScreen } from './components/YouTubeAssetsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Icon } from './components/Icon';
// Use the backend-proxied Gemini service for content generation.
// The proxied service forwards requests to the backend so the client
// doesn't need to hold the Gemini API key. Speech/thumbnail helpers
// that require client-side modalities are re-exported from the proxy.
import * as geminiService from './services/geminiServiceProxy';
import * as youtubeService from './services/youtubeService';
import type { 
    IngestData, 
    AnalysisData,
    BackgroundSuggestion,
    YouTubeAuthState,
} from './types';

type EditorState = { screen: 'editor'; ingestData: IngestData; title: string; background: string; story: string; isStoryComplete: boolean; generationCount: number };
type BaseAppState =
    | { screen: 'ingest' }
    | { screen: 'titleGeneration'; ingestData: IngestData; analysis: AnalysisData }
    | { screen: 'backgroundPrompt'; ingestData: IngestData; analysis: AnalysisData; approvedTitle: string }
    | { screen: 'suggestions'; ingestData: IngestData; approvedTitle: string; backgroundSuggestions: BackgroundSuggestion[] }
    | { screen: 'storyPrompt'; ingestData: IngestData; approvedTitle: string; approvedBackground: string }
    | EditorState
    | { screen: 'youtubeAssets'; previousEditorState: EditorState };

type AppState = BaseAppState | { screen: 'settings'; previousState: BaseAppState };


function App() {
    const [appState, setAppState] = useState<AppState>({ screen: 'ingest' });
    const [loading, setLoading] = useState<{ analysis?: boolean, suggestions?: boolean, story?: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [youtubeAuthState, setYoutubeAuthState] = useState<YouTubeAuthState>({ state: 'loading' });
    const [isAppInitialized, setIsAppInitialized] = useState(false);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Note: Gemini API calls now go through the backend proxy
                // No need to initialize geminiService with API key anymore

                // YouTube service still needs initialization for OAuth
                // The backend handles the YouTube Data API key
                await youtubeService.init(setYoutubeAuthState);
                setIsAppInitialized(true);
            } catch (err) {
                console.error("Initialization failed:", err);
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during initialization.';
                setError(errorMessage);
                setIsAppInitialized(true); // Stop loading, show error
            }
        };

        initializeApp();
    }, []);

    // Suggestions state
    const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
    const [isApprovalModalOpen, setApprovalModalOpen] = useState(false);

    const handleAnalysisStart = useCallback(async (data: IngestData) => {
        setLoading({ analysis: true });
        setError(null);
        try {
            const analysis = await geminiService.analyzeTranscript(data.transcript, data.title, data.imageFile ?? undefined);
            setAppState({
                screen: 'titleGeneration',
                ingestData: data,
                analysis,
            });
        } catch (err) {
            console.error(err);
            setError('Failed to analyze the transcript. Please try again.');
            setAppState({ screen: 'ingest' });
        } finally {
            setLoading({});
        }
    }, []);
    
    const handleTitleApproved = useCallback(async (approvedTitle: string, ingestData: IngestData, analysis: AnalysisData) => {
        setAppState({
            screen: 'backgroundPrompt',
            ingestData: ingestData,
            analysis: analysis,
            approvedTitle: approvedTitle,
        });
    }, []);

    const handleBackgroundsGenerate = useCallback(async (backgroundPrompt: string) => {
        if (appState.screen !== 'backgroundPrompt') return;
        
        setLoading({ suggestions: true });
        setError(null);
        try {
            const backgrounds = await geminiService.generateBackgroundSuggestions(appState.analysis, appState.ingestData.transcript, backgroundPrompt);
            setAppState({
                screen: 'suggestions',
                ingestData: appState.ingestData,
                approvedTitle: appState.approvedTitle,
                backgroundSuggestions: backgrounds,
            });
            setSelectedBackground(backgrounds[0]?.background ?? null);
        } catch (err) {
            console.error(err);
            setError('Failed to generate background suggestions. Please try again.');
        } finally {
            setLoading({});
        }
    }, [appState]);

    const handleProceedToStoryPrompt = useCallback(() => {
        if (appState.screen !== 'suggestions' || !selectedBackground) return;
        setApprovalModalOpen(false);
        setAppState({
            screen: 'storyPrompt',
            ingestData: appState.ingestData,
            approvedTitle: appState.approvedTitle,
            approvedBackground: selectedBackground,
        });
    }, [appState, selectedBackground]);

    const handleGenerateStoryPart = useCallback(async (prompt: string, existingStory: string = '') => {
        let title: string, background: string, ingestData: IngestData, currentGenerationCount = 0;

        if (appState.screen === 'storyPrompt') {
            title = appState.approvedTitle;
            background = appState.approvedBackground;
            ingestData = appState.ingestData;
        } else if (appState.screen === 'editor') {
            title = appState.title;
            background = appState.background;
            ingestData = appState.ingestData;
            currentGenerationCount = appState.generationCount;
        } else {
            return;
        }
        
        setLoading({ story: true });
        setError(null);
        
        try {
            const { storyPart } = await geminiService.generateStoryPart(title, background, ingestData.transcript, prompt, existingStory, currentGenerationCount + 1);
            const newStory = (existingStory ? existingStory + '\n\n' : '') + storyPart;
            const newGenerationCount = currentGenerationCount + 1;

            setAppState({
                screen: 'editor',
                ingestData: ingestData,
                title: title,
                background: background,
                story: newStory,
                isStoryComplete: newGenerationCount >= 2,
                generationCount: newGenerationCount,
            });
        } catch (err) {
            console.error(err);
            setError('Failed to generate the story part. Please try again.');
        } finally {
            setLoading({});
        }
    }, [appState]);

    const handleProceedToAssets = useCallback(() => {
        if (appState.screen !== 'editor') return;
        setAppState({
            screen: 'youtubeAssets',
            previousEditorState: appState,
        });
    }, [appState]);

    const handleSaveVersion = (data: { title: string, background: string, story: string }) => {
        console.log('Version saved:', data);
    };

    const handleRestart = () => {
        setAppState({ screen: 'ingest' });
        setSelectedBackground(null);
        setError(null);
        setLoading({});
    };

    const handleBackToSuggestions = () => {
        if (appState.screen === 'editor') {
            // This behavior might need to be re-evaluated, for now it restarts the process with existing data.
            setLoading({ suggestions: true });
             handleAnalysisStart(appState.ingestData).finally(() => setLoading({}));
        }
    };

    const openSettings = () => {
        if (appState.screen === 'settings') return;
        setAppState({
            screen: 'settings',
            previousState: appState
        });
    };
    
    const renderContent = () => {
        if (!isAppInitialized) {
            return (
               <div className="text-center py-10">
                   <Icon name="loader" className="animate-spin h-8 w-8 text-indigo-400 mx-auto" />
                   <p className="mt-4 text-lg text-gray-400">Initializing services...</p>
               </div>
           );
       }

       if (appState.screen === 'ingest' && error) {
           // If we are on the ingest screen but an init error occurred, don't show the form.
           return null;
       }
       
        switch (appState.screen) {
            case 'ingest':
                return <IngestForm onAnalysisStart={handleAnalysisStart} isLoading={!!loading.analysis} />;
            
            case 'titleGeneration':
                return <TitleGenerationScreen 
                            analysis={appState.analysis} 
                            ingestData={appState.ingestData} 
                            onTitleApproved={handleTitleApproved} 
                        />;

            case 'backgroundPrompt':
                return <BackgroundPromptScreen
                            approvedTitle={appState.approvedTitle}
                            onGenerateBackgrounds={handleBackgroundsGenerate}
                            isLoading={!!loading.suggestions}
                        />;
            
            case 'suggestions':
                return (
                     <RewriteSuggestions 
                        backgroundSuggestions={appState.backgroundSuggestions}
                        selectedBackground={selectedBackground}
                        onBackgroundSelect={setSelectedBackground}
                        onApprove={() => setApprovalModalOpen(true)}
                        isGeneratingStory={!!loading.story}
                        isLoadingSuggestions={!!loading.suggestions}
                    />
                );
            case 'storyPrompt':
                return (
                    <StoryPromptScreen
                        approvedTitle={appState.approvedTitle}
                        approvedBackground={appState.approvedBackground}
                        onGenerate={handleGenerateStoryPart}
                        isLoading={!!loading.story}
                    />
                );
            case 'editor':
                return (
                    <StoryEditor 
                        title={appState.title}
                        background={appState.background}
                        story={appState.story}
                        thumbnailUrl={appState.ingestData.imageDataUrl || ''}
                        transcript={appState.ingestData.transcript}
                        onSaveVersion={handleSaveVersion}
                        onEdit={handleBackToSuggestions}
                        onContinue={handleGenerateStoryPart}
                        isGenerating={!!loading.story}
                        isStoryComplete={appState.isStoryComplete}
                        onProceedToAssets={handleProceedToAssets}
                    />
                );
            case 'youtubeAssets':
                 return (
                    <YouTubeAssetsScreen
                        title={appState.previousEditorState.title}
                        story={appState.previousEditorState.story}
                        onBackToEditor={() => setAppState(appState.previousEditorState)}
                        youtubeAuthState={youtubeAuthState}
                    />
                );
            case 'settings':
                return (
                    <SettingsScreen
                        youtubeAuthState={youtubeAuthState}
                        onSignIn={youtubeService.signIn}
                        onSignOut={youtubeService.signOut}
                        onClose={() => setAppState(appState.previousState)}
                    />
                );
            default:
                return null;
        }
    }

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen">
            <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-gray-800">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Icon name="logo" className="h-8 w-8 text-indigo-500" />
                        <h1 className="text-2xl font-bold text-white tracking-tight">Storyteller AI</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {appState.screen !== 'ingest' && (
                            <button onClick={handleRestart} className="text-sm font-medium text-gray-400 hover:text-white flex items-center gap-2">
                                 <Icon name="restart" className="h-4 w-4" />
                                <span>Start Over</span>
                            </button>
                        )}
                        <button onClick={openSettings} className="text-gray-400 hover:text-white" aria-label="Settings">
                            <Icon name="settings" className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </header>
            <main className="py-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md text-center mb-8">{error}</div>}
                    {renderContent()}
                </div>
            </main>
            {isApprovalModalOpen && appState.screen === 'suggestions' && appState.approvedTitle && selectedBackground && (
                <ApprovalModal
                    title={appState.approvedTitle}
                    background={selectedBackground}
                    onApprove={handleProceedToStoryPrompt}
                    onCancel={() => setApprovalModalOpen(false)}
                />
            )}
        </div>
    );
}

export default App;