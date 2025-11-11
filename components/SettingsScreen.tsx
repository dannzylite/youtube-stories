import React from 'react';
import { Icon } from './Icon';
import type { YouTubeAuthState } from '../types';

interface SettingsScreenProps {
    youtubeAuthState: YouTubeAuthState;
    onSignIn: () => void;
    onSignOut: () => void;
    onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ youtubeAuthState, onSignIn, onSignOut, onClose }) => {
    const isConnected = youtubeAuthState.state === 'signed_in';
    const isLoading = youtubeAuthState.state === 'loading';

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">Settings</h2>
                <button onClick={onClose} className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                    &larr; Back
                </button>
            </div>

            <div className="space-y-6 bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold text-white">Integrations</h3>
                
                {youtubeAuthState.error && (
                    <div className="bg-red-900/80 p-3 rounded-md text-sm text-red-200 border border-red-700">
                        <p className="font-semibold">Connection Error:</p>
                        <p className="whitespace-pre-wrap">{youtubeAuthState.error}</p>
                        {youtubeAuthState.error.includes("not configured") && (
                            <p className="mt-2">
                                You need to create an OAuth 2.0 Client ID in the Google Cloud Console. 
                                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-white">
                                    Click here to go to the Credentials page.
                                </a>
                            </p>
                        )}
                         {youtubeAuthState.error.toLowerCase().includes("api key") && (
                            <p className="mt-2">
                                Please verify the API Key in your `index.html` file is correct and has no restrictions in the Google Cloud Console.
                            </p>
                        )}
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-4">
                        <Icon name="youtube" className="h-8 w-8 text-red-500 flex-shrink-0" />
                        <div>
                           {isConnected && youtubeAuthState.user ? (
                                <>
                                    <h4 className="font-semibold text-white">{youtubeAuthState.user.name}</h4>
                                    <p className="text-sm text-gray-400">{youtubeAuthState.user.email}</p>
                                    <p className="mt-1 text-sm text-green-400 font-medium">Connected</p>
                                </>
                            ) : (
                                <>
                                    <h4 className="font-semibold text-white">YouTube Channel</h4>
                                    <p className="text-sm text-gray-400">
                                        {isLoading ? 'Initializing...' : (youtubeAuthState.error ? 'Connection Failed' : 'Not Connected')}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={isConnected ? onSignOut : onSignIn}
                        disabled={isLoading || !!youtubeAuthState.error}
                        className={`mt-4 sm:mt-0 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white w-full sm:w-auto ${isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50`}
                    >
                         {isLoading ? <Icon name="loader" className="animate-spin h-5 w-5" /> : <Icon name={isConnected ? 'restart' : 'youtube-connect'} className="h-5 w-5" />}
                        <span>{isConnected ? 'Disconnect' : 'Connect Channel'}</span>
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    Connecting your YouTube channel will allow you to post generated content directly. The app will request permission to upload videos and manage your YouTube account.
                </p>
            </div>
        </div>
    );
};