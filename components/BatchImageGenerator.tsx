import React, { useState } from 'react';
import { Icon } from './Icon';
import * as geminiService from '../services/geminiServiceProxy';
import JSZip from 'jszip';

interface BatchImageGeneratorProps {
    story: string;
    title: string;
}

export const BatchImageGenerator: React.FC<BatchImageGeneratorProps> = ({ story, title }) => {
    const [numberOfImages, setNumberOfImages] = useState<number>(10);
    const [customNumber, setCustomNumber] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [notification, setNotification] = useState('');
    const [generatedImages, setGeneratedImages] = useState<geminiService.BatchImageResult[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const presetOptions = [10, 25, 50, 100];

    const handleGenerate = async () => {
        const count = customNumber ? parseInt(customNumber) : numberOfImages;

        if (count < 1 || count > 200) {
            setNotification('Please enter a number between 1 and 200');
            return;
        }

        setIsGenerating(true);
        setProgress({ current: 0, total: count });
        setNotification(`Analyzing story and generating ${count} scene prompts...`);
        setGeneratedImages([]);
        setShowPreview(false);

        try {
            // Call the batch generation API
            const result = await geminiService.generateBatchImages(story, title, count);

            setGeneratedImages(result);
            setProgress({ current: result.length, total: count });

            // Show appropriate message based on success rate
            const successCount = result.length;
            const failedCount = count - successCount;

            if (failedCount === 0) {
                setNotification(`Successfully generated all ${successCount} images!`);
            } else if (successCount > 0) {
                setNotification(`Generated ${successCount} of ${count} images (${failedCount} failed and were skipped)`);
            } else {
                setNotification(`Error: All ${count} images failed to generate. Please try again.`);
            }

            if (successCount > 0) {
                setShowPreview(true);
            }

        } catch (error: any) {
            console.error('Batch image generation failed:', error);
            setNotification(`Error: ${error.message || 'Failed to generate images'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadZip = async () => {
        if (generatedImages.length === 0) return;

        setNotification('Creating ZIP file...');

        try {
            const zip = new JSZip();
            const folder = zip.folder(`${title.replace(/[^a-z0-9]/gi, '_')}_scenes`);

            if (!folder) {
                throw new Error('Failed to create ZIP folder');
            }

            // Add each image to the ZIP
            generatedImages.forEach((img) => {
                const imageData = img.imageBytes;
                // Convert base64 to binary
                const binaryData = atob(imageData);
                const bytes = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                    bytes[i] = binaryData.charCodeAt(i);
                }

                const fileName = `scene_${String(img.sceneNumber).padStart(3, '0')}.png`;
                folder.file(fileName, bytes);

                // Also add a text file with scene description and prompt
                const metadataFileName = `scene_${String(img.sceneNumber).padStart(3, '0')}_info.txt`;
                const metadata = `Scene ${img.sceneNumber}\n\n` +
                    `Description:\n${img.sceneDescription}\n\n` +
                    `Image Prompt:\n${img.imagePrompt}`;
                folder.file(metadataFileName, metadata);
            });

            // Generate the ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // Download the ZIP
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${generatedImages.length}_scenes_${timestamp}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setNotification('ZIP file downloaded successfully!');
        } catch (error: any) {
            console.error('Failed to create ZIP:', error);
            setNotification(`Error creating ZIP: ${error.message}`);
        }
    };

    const progressPercent = progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    return (
        <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-white">Batch Image Generation</h4>
                {generatedImages.length > 0 && (
                    <span className="text-sm text-green-400">
                        {generatedImages.length} images ready
                    </span>
                )}
            </div>

            {notification && (
                <div className={`${
                    notification.startsWith('Error')
                        ? 'bg-red-900/50 border-red-700 text-red-200'
                        : 'bg-blue-900/50 border-blue-700 text-blue-200'
                } border px-3 py-2 rounded-md text-sm`}>
                    {notification}
                </div>
            )}

            {!isGenerating && generatedImages.length === 0 && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                        Generate multiple cinematic images from your story for use in YouTube videos or thumbnails.
                    </p>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">
                            Number of Images:
                        </label>

                        <div className="flex flex-wrap gap-2">
                            {presetOptions.map((num) => (
                                <button
                                    key={num}
                                    onClick={() => {
                                        setNumberOfImages(num);
                                        setCustomNumber('');
                                    }}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                        numberOfImages === num && !customNumber
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                            <input
                                type="number"
                                placeholder="Custom"
                                min="1"
                                max="200"
                                value={customNumber}
                                onChange={(e) => setCustomNumber(e.target.value)}
                                className="w-24 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <p className="text-xs text-gray-500">
                            Estimated time: ~{Math.ceil(((customNumber ? parseInt(customNumber) : numberOfImages) * 2.5) / 60)} minutes
                        </p>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !story.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon name="image" className="h-5 w-5" />
                        <span>Generate {customNumber || numberOfImages} Images</span>
                    </button>
                </div>
            )}

            {isGenerating && (
                <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-300">
                        <span>Generating images...</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-purple-500 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                        This may take several minutes. Please don't close this tab.
                    </p>
                </div>
            )}

            {generatedImages.length > 0 && !isGenerating && (
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownloadZip}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                            <Icon name="download" className="h-4 w-4" />
                            <span>Download All as ZIP</span>
                        </button>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600"
                        >
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                    </div>

                    {showPreview && (
                        <div className="max-h-96 overflow-y-auto space-y-3 p-3 bg-gray-800/50 rounded-md">
                            {generatedImages.map((img, index) => (
                                <div key={index} className="space-y-2 p-3 bg-gray-900/50 rounded-md border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <h5 className="text-sm font-semibold text-white">
                                            Scene {img.sceneNumber}
                                        </h5>
                                        <span className="text-xs text-gray-500">
                                            {index + 1}/{generatedImages.length}
                                        </span>
                                    </div>
                                    <img
                                        src={`data:image/png;base64,${img.imageBytes}`}
                                        alt={`Scene ${img.sceneNumber}`}
                                        className="w-full rounded-md"
                                    />
                                    <p className="text-xs text-gray-400">{img.sceneDescription}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setGeneratedImages([]);
                            setShowPreview(false);
                            setNotification('');
                        }}
                        className="w-full px-4 py-2 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600"
                    >
                        Generate New Batch
                    </button>
                </div>
            )}
        </div>
    );
};
