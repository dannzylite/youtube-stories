
import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiServiceProxy';
import * as youtubeService from '../services/youtubeService';
import * as dataUtils from '../utils/dataUtils';
import type { YouTubeMetadata, YouTubeAuthState } from '../types';
import { Icon } from './Icon';

interface YouTubeAssetsScreenProps {
    title: string;
    story: string;
    onBackToEditor: () => void;
    youtubeAuthState: YouTubeAuthState;
}

export const YouTubeAssetsScreen: React.FC<YouTubeAssetsScreenProps> = ({ title, story, onBackToEditor, youtubeAuthState }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
    const [isThumbnailLoading, setIsThumbnailLoading] = useState(true);
    const [isMetadataLoading, setIsMetadataLoading] = useState(true);
    
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const [regenerationPrompt, setRegenerationPrompt] = useState('');
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [channelName, setChannelName] = useState('Your Channel Name');
    
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

     useEffect(() => {
        if (notification && !uploadSuccess) {
            // Only auto-clear regular notifications, not success messages
            const timeout = setTimeout(() => setNotification(''), 3000);
            return () => clearTimeout(timeout);
        }
    }, [notification, uploadSuccess]);

    useEffect(() => {
        const generateInitialAssets = async () => {
            setIsThumbnailLoading(true);
            setIsMetadataLoading(true);
            setError(null);
            try {
                // Generate metadata and thumbnail separately to handle errors independently
                const metaPromise = geminiService.generateYouTubeMetadata(story, title, channelName);

                let thumbnailError = null;
                let thumbData = null;

                try {
                    thumbData = await geminiService.generateThumbnail(story, title);
                    setThumbnailUrl(`data:image/png;base64,${thumbData}`);
                } catch (thumbErr: any) {
                    // Check if it's a billing error for Imagen
                    if (thumbErr?.message?.includes('billed users') || thumbErr?.error?.message?.includes('billed users')) {
                        thumbnailError = "Imagen API requires billing to be enabled. Please enable billing in your Google AI Studio account, or upload a custom thumbnail.";
                    } else {
                        thumbnailError = "Failed to generate thumbnail. You can upload a custom thumbnail instead.";
                    }
                    console.error("Thumbnail generation error:", thumbErr);
                }

                const meta = await metaPromise;
                setMetadata(meta);

                // Set error only if thumbnail failed (non-fatal error)
                if (thumbnailError) {
                    setError(thumbnailError);
                }
            } catch (err) {
                setError("Failed to generate YouTube metadata. Please try again.");
                console.error(err);
            } finally {
                setIsThumbnailLoading(false);
                setIsMetadataLoading(false);
            }
        };
        generateInitialAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [story, title, channelName]);
    
    const handleCopyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setNotification(`${type} copied to clipboard!`);
    };

    const handleDownloadThumbnail = () => {
        if (!thumbnailUrl) return;
        const a = document.createElement('a');
        a.href = thumbnailUrl;
        a.download = `thumbnail_${title.replace(/\s/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setNotification('Thumbnail downloaded!');
    };
    
    const handleRegenerateThumbnail = async () => {
        if (!regenerationPrompt.trim()) return;
        setIsThumbnailLoading(true);
        setError(null);
        try {
            const thumbData = await geminiService.generateThumbnail(story, title, regenerationPrompt);
            setThumbnailUrl(`data:image/png;base64,${thumbData}`);
            setNotification('Thumbnail regenerated!');
        } catch (err) {
            setError('Failed to regenerate thumbnail.');
            console.error(err);
        } finally {
            setIsThumbnailLoading(false);
        }
    };

    const handleRefineThumbnail = async () => {
        if (!refinementPrompt.trim() || !thumbnailUrl) return;
        setIsThumbnailLoading(true);
        setError(null);
        try {
            const base64Data = thumbnailUrl.split(',')[1];
            const refinedThumbData = await geminiService.refineThumbnail(base64Data, refinementPrompt);
            setThumbnailUrl(`data:image/png;base64,${refinedThumbData}`);
            setNotification('Thumbnail refined!');
            setRefinementPrompt('');
        } catch (err) {
            setError('Failed to refine thumbnail.');
            console.error(err);
        } finally {
            setIsThumbnailLoading(false);
        }
    };

    const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file (PNG, JPG, etc.).');
                return;
            }

            // Read the file and convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailUrl(reader.result as string);
                setNotification('Custom thumbnail uploaded!');
                setError(null);
            };
            reader.onerror = () => {
                setError('Failed to read image file.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRegenerateMetadata = async () => {
        if (!channelName.trim()) return;
        setIsMetadataLoading(true);
        setError(null);
        try {
            const meta = await geminiService.generateYouTubeMetadata(story, title, channelName);
            setMetadata(meta);
            setNotification('Description & Tags regenerated!');
        } catch (err) {
            setError('Failed to regenerate metadata.');
            console.error(err);
        } finally {
            setIsMetadataLoading(false);
        }
    };

    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                setError('Please upload a valid video file (MP4, MOV, etc.).');
                return;
            }
            setVideoFile(file);
            setError('');
        }
    };

    const handlePostToYouTube = async () => {
        if (!videoFile || !metadata || !thumbnailUrl) {
            setError('Missing video file, metadata, or thumbnail.');
            return;
        }

        // Check YouTube authentication status
        if (youtubeAuthState.state !== 'signed_in') {
            setError('Please sign in to YouTube in Settings before uploading.');
            return;
        }

        console.log('Starting upload with:', {
            title,
            videoFileName: videoFile.name,
            hasThumbnail: !!thumbnailUrl,
            hasMetadata: !!metadata,
            authState: youtubeAuthState.state
        });

        setIsUploading(true);
        setUploadProgress(0);
        setError(null);
        setUploadSuccess(false);
        setNotification('Starting YouTube upload...');

        try {
            const thumbnailBlob = dataUtils.base64ToBlob(thumbnailUrl.split(',')[1], 'image/png');

            await youtubeService.uploadVideo({
                videoFile: videoFile,
                thumbnailFile: thumbnailBlob,
                title: title,
                description: metadata.description,
                tags: metadata.tags,
            }, (progress) => {
                 setUploadProgress(progress);
                 setNotification(`Uploading... ${Math.round(progress)}%`);
            });

            // Upload completed successfully!
            setUploadSuccess(true);
            setNotification('🎉 Video successfully uploaded to YouTube!');

            // Keep the success notification visible for longer
            setTimeout(() => {
                setUploadSuccess(false);
            }, 10000); // 10 seconds

        } catch (err: any) {
             // Check if this is a partial success (video uploaded but thumbnail failed)
             if (err.partialSuccess) {
                 setUploadSuccess(true);
                 setNotification('✅ Video uploaded successfully!');
                 setError(err.message); // Show the thumbnail warning as an error

                 // Keep the success notification visible
                 setTimeout(() => {
                     setUploadSuccess(false);
                 }, 10000);
             } else {
                 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during upload.';
                 setError(`Upload failed: ${errorMessage}`);
                 console.error(err);
                 setUploadSuccess(false);
             }
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };


    const isPostButtonDisabled = youtubeAuthState.state !== 'signed_in'
        || isUploading
        || isMetadataLoading
        || !videoFile
        || !thumbnailUrl; // Require a thumbnail (either generated or uploaded)

    return (
        <div className="space-y-8">
             {notification && (
                <div className={`fixed top-5 right-5 px-6 py-4 rounded-lg text-center shadow-2xl z-50 transition-all ${
                    uploadSuccess
                        ? 'bg-green-600 border-2 border-green-400 text-white text-lg font-bold animate-pulse'
                        : 'bg-green-900 border border-green-700 text-green-200'
                }`}>
                    {notification}
                </div>
            )}
            <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-bold text-white sm:text-4xl">YouTube Assets</h2>
                <button onClick={onBackToEditor} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
                    <Icon name="edit" className="h-4 w-4" />
                    <span>Back to Story Editor</span>
                </button>
            </div>
            
            {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md text-center">{error}</div>}

            <div className="space-y-8">
                {/* Title */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Final Title</p>
                    <p className="text-xl font-bold text-white mt-1">{title}</p>
                </div>
                
                {/* Thumbnail */}
                <div className="space-y-4">
                     <h3 className="text-xl font-bold text-white">Generated Thumbnail</h3>
                     <div className="relative aspect-video w-full max-w-lg mx-auto bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700 overflow-hidden">
                         {isThumbnailLoading && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                                <Icon name="loader" className="animate-spin h-8 w-8 text-indigo-400 mx-auto" />
                                <p className="mt-2 text-gray-300">Generating...</p>
                            </div>
                         )}
                         {thumbnailUrl ? (
                             <img src={thumbnailUrl} alt="Generated thumbnail" className="rounded-lg object-cover w-full h-full"/>
                         ) : (
                             !isThumbnailLoading && <p className="text-gray-500">Could not load thumbnail.</p>
                         )}
                     </div>
                      {!isThumbnailLoading && thumbnailUrl && (
                          <div className="text-center">
                              <button onClick={handleDownloadThumbnail} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                                  Download Thumbnail
                              </button>
                          </div>
                      )}
                </div>
                
                {/* Thumbnail Editing Tools */}
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-3">
                        <h4 className="font-semibold text-white">Upload Custom Thumbnail</h4>
                        <p className="text-sm text-gray-400">Upload your own thumbnail image (PNG, JPG, etc.).</p>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="thumbnail-upload" className="w-full flex flex-col items-center justify-center h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Icon name="upload" className="w-8 h-8 mb-2 text-gray-400" />
                                    <p className="text-xs text-gray-400">Click to upload</p>
                                    <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
                                </div>
                                <input
                                    id="thumbnail-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleThumbnailUpload}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-3">
                        <h4 className="font-semibold text-white">Regenerate Thumbnail</h4>
                        <p className="text-sm text-gray-400">Write a new prompt to generate a completely different thumbnail from scratch.</p>
                        <textarea
                            value={regenerationPrompt}
                            onChange={(e) => setRegenerationPrompt(e.target.value)}
                            rows={3}
                            placeholder="e.g., A close up on a mysterious glowing artifact on a table..."
                            className="w-full bg-gray-800/80 border border-gray-600 rounded-md sm:text-sm text-gray-300 leading-relaxed px-3 py-2"
                        />
                        <button onClick={handleRegenerateThumbnail} disabled={isThumbnailLoading || !regenerationPrompt.trim()} className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            Regenerate
                        </button>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-3">
                        <h4 className="font-semibold text-white">Refine Thumbnail</h4>
                        <p className="text-sm text-gray-400">Give a command to edit the current image.</p>
                        <input
                            type="text"
                            value={refinementPrompt}
                            onChange={(e) => setRefinementPrompt(e.target.value)}
                            placeholder="e.g., Remove the person in the background"
                             className="w-full bg-gray-800/80 border border-gray-600 rounded-md sm:text-sm text-gray-300 leading-relaxed px-3 py-2"
                        />
                        <button onClick={handleRefineThumbnail} disabled={isThumbnailLoading || !refinementPrompt.trim() || !thumbnailUrl} className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            Refine
                        </button>
                    </div>
                 </div>

                {/* Description and Tags */}
                 <div className="space-y-4">
                     <h3 className="text-xl font-bold text-white">Description & Tags</h3>
                     
                     <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-3">
                        <h4 className="font-semibold text-white">Channel Configuration</h4>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                           <input
                                type="text"
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                placeholder="Enter your YouTube channel name"
                                className="flex-grow w-full bg-gray-800/80 border border-gray-600 rounded-md sm:text-sm text-gray-300 leading-relaxed px-3 py-2"
                            />
                            <button onClick={handleRegenerateMetadata} disabled={isMetadataLoading || !channelName.trim()} className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                Regenerate
                            </button>
                        </div>
                    </div>
                     
                     <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 space-y-6">
                         {isMetadataLoading ? (
                            <div className="text-center">
                                <Icon name="loader" className="animate-spin h-8 w-8 text-indigo-400 mx-auto" />
                                <p className="mt-2 text-gray-400">Generating metadata...</p>
                            </div>
                         ) : metadata ? (
                            <>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label htmlFor="yt-description" className="block text-base font-semibold text-white">YouTube Description</label>
                                        <button onClick={() => handleCopyToClipboard(metadata.description, 'Description')} className="text-sm font-medium text-indigo-400 hover:text-indigo-300">Copy</button>
                                    </div>
                                    <textarea id="yt-description" value={metadata.description} readOnly rows={12} className="w-full bg-gray-800/80 border border-gray-600 rounded-md sm:text-sm text-gray-300 leading-relaxed px-3 py-2 whitespace-pre-wrap"/>
                                </div>
                                 <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="block text-base font-semibold text-white">Tags</h4>
                                        <button onClick={() => handleCopyToClipboard(metadata.tags.join(', '), 'Tags')} className="text-sm font-medium text-indigo-400 hover:text-indigo-300">Copy All</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {metadata.tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 text-sm font-medium bg-gray-700 text-gray-200 rounded-full">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </>
                         ) : (
                             <p className="text-gray-500 text-center">Could not load metadata.</p>
                         )}
                     </div>
                 </div>
                 
                 {/* Video Upload */}
                 <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Upload Final Video</h3>
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                         <div className="flex justify-center rounded-lg border border-dashed border-gray-600 px-6 py-10">
                            {videoFile ? (
                                <div className="text-center">
                                    <Icon name="check" className="mx-auto h-12 w-12 text-green-400" />
                                    <p className="mt-2 text-white font-semibold">{videoFile.name}</p>
                                    <p className="text-xs text-gray-400">{(videoFile.size / (1024*1024)).toFixed(2)} MB</p>
                                    <button onClick={() => setVideoFile(null)} className="mt-4 text-sm font-medium text-red-400 hover:text-red-300">Remove Video</button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Icon name="upload" className="mx-auto h-12 w-12 text-gray-500" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-400">
                                        <label htmlFor="video-upload" className="relative cursor-pointer rounded-md font-semibold text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-indigo-300">
                                            <span>Upload a video file</span>
                                            <input id="video-upload" name="video-upload" type="file" className="sr-only" onChange={handleVideoFileChange} accept="video/*" />
                                        </label>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-500">MP4, MOV, WEBM, etc.</p>
                                </div>
                            )}
                        </div>
                        {isUploading && (
                             <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div>
                            </div>
                        )}
                    </div>
                 </div>
            </div>

            <div className="pt-8 border-t border-gray-700 flex justify-end">
                <button
                    onClick={handlePostToYouTube}
                    disabled={isPostButtonDisabled}
                    className="inline-flex items-center gap-3 px-6 py-3 text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={youtubeAuthState.state !== 'signed_in' ? "Connect your YouTube channel in Settings to post" : !videoFile ? "Please upload a video file to post" : ""}
                >
                    {isUploading ? <Icon name="loader" className="animate-spin h-5 w-5" /> : <Icon name="youtube" className="h-5 w-5" />}
                    <span>{isUploading ? `Uploading (${Math.round(uploadProgress)}%)...` : 'Post to YouTube'}</span>
                </button>
            </div>
        </div>
    );
};
