import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import textToSpeech from '@google-cloud/text-to-speech';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini client
const geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Initialize Google Cloud TTS client
// Note: This requires service account credentials, not an API key
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json';

console.log(`[Init] Using service account key file: ${keyFilename}`);

// Initialize Google Cloud TTS client for fast generation
const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: keyFilename
});

// Middleware
// Allow all origins for network testing - in production, restrict this
app.use(cors({
    origin: true, // Allow any origin
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// List available models (for debugging)
app.get('/api/gemini/models', async (req, res) => {
    try {
        const models = await geminiClient.models.list();
        res.json({ models });
    } catch (error) {
        console.error('Error listing models:', error);
        res.status(500).json({
            error: error.message || 'Failed to list models'
        });
    }
});

// Proxy endpoint for Gemini content generation
app.post('/api/gemini/generate', async (req, res) => {
    try {
        const { model, contents, config } = req.body;

        if (!model || !contents) {
            return res.status(400).json({
                error: 'Missing required fields: model, contents'
            });
        }

        const response = await geminiClient.models.generateContent({
            model,
            contents,
            config
        });

        res.json({
            text: response.text,
            candidates: response.candidates
        });
    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({
            error: error.message || 'Failed to generate content'
        });
    }
});

// Proxy endpoint for image generation
app.post('/api/gemini/generate-image', async (req, res) => {
    try {
        const { model, prompt, config } = req.body;

        if (!model || !prompt) {
            return res.status(400).json({
                error: 'Missing required fields: model, prompt'
            });
        }

        const response = await geminiClient.models.generateImages({
            model,
            prompt,
            config
        });

        const imageData = response.generatedImages[0]?.image?.imageBytes;

        if (!imageData) {
            throw new Error('No image data returned');
        }

        res.json({ imageBytes: imageData });
    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({
            error: error.message || 'Failed to generate image'
        });
    }
});

// Proxy endpoint for speech generation (preview)
app.post('/api/gemini/generate-speech-preview', async (req, res) => {
    try {
        const { voiceName, speakingRate = 1.0, engine = 'gemini' } = req.body;

        if (!voiceName) {
            return res.status(400).json({
                error: 'Missing required field: voiceName'
            });
        }

        const PREVIEW_TEXT = "Listen to the sound of my voice, and imagine the story I will tell.";

        console.log(`[Backend Speech Preview] Attempting to generate speech preview with voice: ${voiceName}`);
        console.log(`[Backend Speech Preview] Engine: ${engine}`);
        console.log(`[Backend Speech Preview] Speaking rate: ${speakingRate}x`);

        let base64Audio;

        if (engine === 'google-cloud') {
            // Use Google Cloud TTS for preview
            console.log(`[Backend Speech Preview] Using Google Cloud voice: ${voiceName}`);

            const request = {
                input: { text: PREVIEW_TEXT },
                voice: {
                    languageCode: 'en-US',
                    name: voiceName,
                },
                audioConfig: {
                    audioEncoding: 'LINEAR16',
                    speakingRate: speakingRate,
                },
            };

            console.log(`[Backend Speech Preview] Request: text-to-speech for ${PREVIEW_TEXT.length} chars`);
            const [response] = await cloudTtsClient.synthesizeSpeech(request);
            console.log(`[Backend Speech Preview] Received ${response.audioContent.length} bytes of audio`);
            base64Audio = response.audioContent.toString('base64');
        } else {
            // Use Gemini TTS for preview
            const model = "gemini-2.5-pro-preview-tts";
            console.log(`[Backend Speech Preview] Using model: ${model}`);

            const response = await geminiClient.models.generateContent({
                model,
                contents: [{ parts: [{ text: PREVIEW_TEXT }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName },
                        },
                    },
                },
            });

            console.log('Response received from Gemini TTS');

            base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!base64Audio) {
                console.error('No audio data in response from Gemini TTS');
                throw new Error(`Could not generate audio preview for voice "${voiceName}". This voice may not be supported by the Gemini TTS API.`);
            }
        }

        res.json({ audioData: base64Audio });
    } catch (error) {
        console.error('Speech preview generation error:', error.message);
        res.status(500).json({
            error: error.message || 'Failed to generate speech preview'
        });
    }
});

// Proxy endpoint for full speech generation
app.post('/api/gemini/generate-speech', async (req, res) => {
    try {
        const { text, voiceName, speakingRate = 1.0 } = req.body;

        if (!text || !voiceName) {
            return res.status(400).json({
                error: 'Missing required fields: text, voiceName'
            });
        }

        console.log(`[Backend Speech] Generating speech for ${text.length} characters with voice: ${voiceName}`);
        console.log(`[Backend Speech] Speaking rate: ${speakingRate}x`);

        const model = "gemini-2.5-flash-preview-tts";

        console.log(`[Backend Speech] Using model: ${model}`);

        const response = await geminiClient.models.generateContent({
            model,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                    // Note: Gemini TTS doesn't support speakingRate parameter
                    // Speed control is done via natural language prompts in the text
                },
            },
        });

        console.log(`[Backend Speech] Response received, checking for audio data...`);

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
            console.error('[Backend Speech] No audio data in response from Gemini');
            throw new Error('Could not generate audio from text.');
        }

        console.log(`[Backend Speech] Successfully generated audio, base64 length: ${base64Audio.length}`);

        res.json({ audioData: base64Audio });
    } catch (error) {
        console.error('[Backend Speech] Speech generation error:', error.message);
        res.status(500).json({
            error: error.message || 'Failed to generate speech'
        });
    }
});

// Proxy endpoint for long audio synthesis
// Supports both Gemini TTS (premium, slower) and Google Cloud TTS (fast)
app.post('/api/tts/synthesize-long-audio', async (req, res) => {
    try {
        const { text, voiceName, engine = 'gemini', speakingRate = 1.0 } = req.body;

        if (!text || !voiceName) {
            return res.status(400).json({
                error: 'Missing required fields: text, voiceName'
            });
        }

        const engineName = engine === 'gemini' ? 'Gemini TTS' : 'Google Cloud TTS';
        console.log(`\n======================================`);
        console.log(`[Long Audio TTS] NEW REQUEST`);
        console.log(`[Long Audio TTS] Text length: ${text.length} characters`);
        console.log(`[Long Audio TTS] Voice: ${voiceName}`);
        console.log(`[Long Audio TTS] Engine: ${engineName}`);
        console.log(`[Long Audio TTS] Engine parameter received: '${engine}'`);
        console.log(`[Long Audio TTS] Speaking rate: ${speakingRate}x`);
        console.log(`======================================\n`);

        // Split text into chunks based on engine
        // Gemini: 3000 chars for better voice consistency
        // Google Cloud TTS: 4000 chars (safe limit to stay under 5000 bytes)
        const CHUNK_SIZE = engine === 'gemini' ? 3000 : 4000;
        const chunks = [];
        let remainingText = text;

        while (remainingText.length > 0) {
            if (remainingText.length <= CHUNK_SIZE) {
                chunks.push(remainingText);
                break;
            }

            let chunk = remainingText.substring(0, CHUNK_SIZE);
            let lastPeriod = chunk.lastIndexOf('.');
            let lastNewline = chunk.lastIndexOf('\n');

            let splitIndex = Math.max(lastPeriod, lastNewline);
            if (splitIndex === -1 || splitIndex < CHUNK_SIZE * 0.5) {
                splitIndex = CHUNK_SIZE;
            } else {
                splitIndex += 1;
            }

            const currentChunk = remainingText.substring(0, splitIndex);
            chunks.push(currentChunk);
            remainingText = remainingText.substring(splitIndex);
        }

        console.log(`[Long Audio TTS] Split into ${chunks.length} chunks`);

        const audioChunks = [];
        const startTime = Date.now();

        if (engine === 'gemini') {
            // Process with Gemini TTS (premium voices, slower)
            const model = "gemini-2.5-pro-preview-tts";

            for (let i = 0; i < chunks.length; i++) {
                console.log(`[Long Audio TTS] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);

                // Aggressive retry logic for Gemini's strict rate limits
                let retries = 5; // Increased from 3 to 5 retries
                let retryDelay = 3000; // Start with 3 seconds
                let chunkSuccess = false;
                let lastError = null;

                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        console.log(`[Long Audio TTS] Chunk ${i + 1} attempt ${attempt}/${retries}...`);

                        const response = await geminiClient.models.generateContent({
                            model,
                            contents: [{ parts: [{ text: chunks[i] }] }],
                            config: {
                                responseModalities: ['AUDIO'],
                                speechConfig: {
                                    voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: voiceName },
                                    },
                                },
                            },
                        });

                        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

                        if (!base64Audio) {
                            throw new Error(`No audio data returned for chunk ${i + 1}`);
                        }

                        const audioBuffer = Buffer.from(base64Audio, 'base64');

                        // Log first few bytes to debug audio format
                        const header = audioBuffer.slice(0, Math.min(12, audioBuffer.length));
                        console.log(`[Long Audio TTS] Chunk ${i + 1} header bytes:`, Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' '));
                        console.log(`[Long Audio TTS] Chunk ${i + 1} size: ${audioBuffer.length} bytes`);

                        audioChunks.push(audioBuffer);
                        chunkSuccess = true;
                        break; // Success! Exit retry loop

                    } catch (chunkError) {
                        lastError = chunkError;
                        console.error(`[Long Audio TTS] Chunk ${i + 1} attempt ${attempt} failed:`, chunkError.message);

                        if (attempt < retries) {
                            console.log(`[Long Audio TTS] Retrying in ${retryDelay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                            retryDelay *= 2; // Exponential backoff: 3s, 6s, 12s, 24s, 48s
                        }
                    }
                }

                if (!chunkSuccess) {
                    console.error(`[Long Audio TTS] Failed chunk ${i + 1} after ${retries} attempts`);
                    throw new Error(`Failed to generate audio for chunk ${i + 1} after ${retries} attempts: ${lastError?.message}`);
                }

                // Reduced delay between chunks for faster generation
                if (i < chunks.length - 1) {
                    const delayMs = 2000; // 2 seconds between chunks

                    console.log(`[Long Audio TTS] Waiting ${delayMs}ms before next chunk...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        } else {
            // Process with Google Cloud TTS (faster)
            // Voice name is already correct from frontend (en-US-Neural2-X format)
            console.log(`[Long Audio TTS] Using Google Cloud voice: ${voiceName}`);

            for (let i = 0; i < chunks.length; i++) {
                console.log(`[Long Audio TTS] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);

                // Retry logic with exponential backoff for Google Cloud TTS too
                let retries = 3;
                let retryDelay = 1000; // Start with 1 second
                let chunkSuccess = false;
                let lastError = null;

                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        console.log(`[Long Audio TTS] Chunk ${i + 1} attempt ${attempt}/${retries}...`);

                        const request = {
                            input: { text: chunks[i] },
                            voice: {
                                languageCode: 'en-US',
                                name: voiceName
                            },
                            audioConfig: {
                                audioEncoding: 'LINEAR16',
                                sampleRateHertz: 24000,
                                speakingRate: speakingRate
                            }
                        };

                        const [response] = await ttsClient.synthesizeSpeech(request);
                        audioChunks.push(response.audioContent);

                        console.log(`[Long Audio TTS] Chunk ${i + 1} complete (${response.audioContent.length} bytes)`);
                        chunkSuccess = true;
                        break; // Success! Exit retry loop

                    } catch (chunkError) {
                        lastError = chunkError;
                        console.error(`[Long Audio TTS] Chunk ${i + 1} attempt ${attempt} failed:`, chunkError.message);

                        if (attempt < retries) {
                            console.log(`[Long Audio TTS] Retrying in ${retryDelay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                            retryDelay *= 2; // Exponential backoff: 1s, 2s, 4s
                        }
                    }
                }

                if (!chunkSuccess) {
                    console.error(`[Long Audio TTS] Failed chunk ${i + 1} after ${retries} attempts`);
                    throw new Error(`Failed to generate audio for chunk ${i + 1} after ${retries} attempts: ${lastError?.message}`);
                }

                // Small delay between chunks
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        // Concatenate all audio chunks
        console.log(`[Long Audio TTS] Concatenating ${audioChunks.length} chunks...`);

        let concatenatedAudio;
        if (audioChunks.length === 1) {
            // Single chunk, no processing needed
            concatenatedAudio = audioChunks[0];
        } else if (engine === 'gemini') {
            // Gemini TTS: Simple concatenation (no crossfading)
            // Gemini returns raw PCM data that maintains natural voice continuity
            console.log(`[Long Audio TTS] Using simple concatenation for Gemini audio...`);
            concatenatedAudio = Buffer.concat(audioChunks);
        } else {
            // Google Cloud TTS: Apply crossfading between chunks to eliminate clicks
            // LINEAR16 format: 16-bit samples, so 2 bytes per sample
            const CROSSFADE_SAMPLES = 480; // 20ms at 24kHz sample rate
            const CROSSFADE_BYTES = CROSSFADE_SAMPLES * 2;

            const mergedChunks = [];

            for (let i = 0; i < audioChunks.length; i++) {
                if (i === 0) {
                    // First chunk: keep all except the last crossfade section
                    if (audioChunks.length > 1 && audioChunks[i].length > CROSSFADE_BYTES) {
                        mergedChunks.push(audioChunks[i].slice(0, -CROSSFADE_BYTES));
                    } else {
                        mergedChunks.push(audioChunks[i]);
                    }
                } else if (i === audioChunks.length - 1) {
                    // Last chunk: crossfade with previous, then add the rest
                    const prevChunkEnd = audioChunks[i - 1].slice(-CROSSFADE_BYTES);
                    const currentChunkStart = audioChunks[i].slice(0, CROSSFADE_BYTES);

                    // Create crossfaded section
                    const crossfaded = Buffer.alloc(CROSSFADE_BYTES);
                    for (let j = 0; j < CROSSFADE_BYTES; j += 2) {
                        // Read 16-bit samples (little-endian)
                        const sample1 = prevChunkEnd.readInt16LE(j);
                        const sample2 = currentChunkStart.readInt16LE(j);

                        // Linear crossfade
                        const progress = j / CROSSFADE_BYTES;
                        const mixed = Math.round(sample1 * (1 - progress) + sample2 * progress);

                        // Clamp to 16-bit range
                        const clamped = Math.max(-32768, Math.min(32767, mixed));
                        crossfaded.writeInt16LE(clamped, j);
                    }

                    mergedChunks.push(crossfaded);
                    mergedChunks.push(audioChunks[i].slice(CROSSFADE_BYTES));
                } else {
                    // Middle chunks: crossfade start, keep middle, prepare end for next crossfade
                    const prevChunkEnd = audioChunks[i - 1].slice(-CROSSFADE_BYTES);
                    const currentChunkStart = audioChunks[i].slice(0, CROSSFADE_BYTES);

                    // Create crossfaded section
                    const crossfaded = Buffer.alloc(CROSSFADE_BYTES);
                    for (let j = 0; j < CROSSFADE_BYTES; j += 2) {
                        const sample1 = prevChunkEnd.readInt16LE(j);
                        const sample2 = currentChunkStart.readInt16LE(j);

                        const progress = j / CROSSFADE_BYTES;
                        const mixed = Math.round(sample1 * (1 - progress) + sample2 * progress);
                        const clamped = Math.max(-32768, Math.min(32767, mixed));
                        crossfaded.writeInt16LE(clamped, j);
                    }

                    mergedChunks.push(crossfaded);
                    mergedChunks.push(audioChunks[i].slice(CROSSFADE_BYTES, -CROSSFADE_BYTES));
                }
            }

            concatenatedAudio = Buffer.concat(mergedChunks);
        }

        console.log(`[Long Audio TTS] Concatenated ${audioChunks.length} chunks into ${concatenatedAudio.length} bytes`);

        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        console.log(`[Long Audio TTS] Complete! Total time: ${totalTime} seconds for ${text.length} characters`);

        // Stream JSON response to avoid OOM from JSON.stringify on large base64 audio data
        const base64Audio = concatenatedAudio.toString('base64');
        res.setHeader('Content-Type', 'application/json');
        res.write('{"audioData":"');
        res.write(base64Audio);
        res.write(`","message":"Long audio synthesis completed successfully","stats":{"characterCount":${text.length},"chunkCount":${audioChunks.length},"audioSizeBytes":${concatenatedAudio.length},"processingTimeSeconds":${totalTime}}}`);
        res.end();

    } catch (error) {
        console.error('[Long Audio TTS] Error occurred:', error.message);

        res.status(500).json({
            error: error.message || 'Failed to synthesize long audio',
            details: error.message
        });
    }
});

// Proxy endpoint for batch image generation
app.post('/api/gemini/batch-generate-images', async (req, res) => {
    try {
        const { story, title, numberOfImages, style } = req.body;

        if (!story || !numberOfImages) {
            return res.status(400).json({
                error: 'Missing required fields: story, numberOfImages'
            });
        }

        console.log(`[Batch Images] Starting batch generation for ${numberOfImages} images`);
        console.log(`[Batch Images] Story length: ${story.length} characters`);
        console.log(`[Batch Images] Style: ${style || 'default'}`);

        // Step 1: Use Gemini to split the story into scenes and generate prompts
        const visionModel = 'gemini-2.5-flash';

        const scenePrompt = `You are an expert at analyzing stories and creating visual scenes for YouTube content.

Read this story and break it down into exactly ${numberOfImages} distinct visual scenes that would work as cinematic YouTube thumbnails.

Story Title: "${title}"

Story:
---
${story}
---

For each scene, create a detailed image generation prompt that:
1. Captures a key moment, emotion, or dramatic beat from that part of the story
2. Follows cinematic YouTube thumbnail aesthetic (vibrant colors, dramatic lighting, emotional close-ups, 16:9 composition)
3. Is highly specific about visual details, lighting, mood, and composition
4. Does NOT include any text or words in the image
5. Maintains visual consistency with the story's theme and setting

Return a JSON array of exactly ${numberOfImages} objects, each with:
- "sceneNumber": the scene number (1-${numberOfImages})
- "sceneDescription": brief description of what happens in this part of the story (2-3 sentences)
- "imagePrompt": detailed prompt for Imagen API (3-5 sentences with specific visual details)`;

        console.log('[Batch Images] Analyzing story and generating scene prompts with Gemini...');

        const sceneResponse = await geminiClient.models.generateContent({
            model: visionModel,
            contents: { parts: [{ text: scenePrompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            sceneNumber: { type: 'INTEGER' },
                            sceneDescription: { type: 'STRING' },
                            imagePrompt: { type: 'STRING' }
                        },
                        required: ['sceneNumber', 'sceneDescription', 'imagePrompt']
                    }
                }
            }
        });

        const scenes = JSON.parse(sceneResponse.text);
        console.log(`[Batch Images] Generated ${scenes.length} scene prompts`);

        // Step 2: Generate images for each scene with rate limiting
        const imageModel = 'imagen-4.0-generate-001';
        const generatedImages = [];

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            console.log(`[Batch Images] Generating image ${i + 1}/${scenes.length} for scene: ${scene.sceneDescription.substring(0, 50)}...`);

            // Add style prefix to the prompt if provided
            const stylePrefix = style || 'Cinematic YouTube thumbnail style:';
            const fullPrompt = `${stylePrefix} ${scene.imagePrompt}`;

            // Retry logic for image generation
            let retries = 3;
            let imageData = null;
            let imageGeneratedSuccessfully = false;

            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const imageResponse = await geminiClient.models.generateImages({
                        model: imageModel,
                        prompt: fullPrompt,
                        config: {
                            numberOfImages: 1,
                            aspectRatio: '16:9',
                            outputMimeType: 'image/png',
                        }
                    });

                    imageData = imageResponse.generatedImages[0]?.image?.imageBytes;

                    if (!imageData) {
                        throw new Error('No image data returned');
                    }

                    console.log(`[Batch Images] Image ${i + 1} generated successfully`);
                    imageGeneratedSuccessfully = true;
                    break; // Success!

                } catch (error) {
                    console.error(`[Batch Images] Image ${i + 1} attempt ${attempt} failed:`, error.message);

                    if (attempt === retries) {
                        console.warn(`[Batch Images] Skipping image ${i + 1} after ${retries} failed attempts. Moving to next scene.`);
                    } else {
                        // Exponential backoff
                        const backoffMs = attempt * 2000;
                        console.log(`[Batch Images] Retrying in ${backoffMs}ms...`);
                        await new Promise(resolve => setTimeout(resolve, backoffMs));
                    }
                }
            }

            // Only add successfully generated images to the array
            if (imageGeneratedSuccessfully && imageData) {
                generatedImages.push({
                    sceneNumber: scene.sceneNumber,
                    sceneDescription: scene.sceneDescription,
                    imagePrompt: scene.imagePrompt,
                    imageBytes: imageData
                });
            }

            // Rate limiting: wait between images (except for the last one)
            if (i < scenes.length - 1) {
                const delayMs = 1500; // 1.5 second delay between image generations
                console.log(`[Batch Images] Waiting ${delayMs}ms before next image...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        const successCount = generatedImages.length;
        const failedCount = numberOfImages - successCount;

        console.log(`[Batch Images] Completed: ${successCount}/${numberOfImages} images generated successfully`);
        if (failedCount > 0) {
            console.log(`[Batch Images] ${failedCount} image(s) failed and were skipped`);
        }

        // Stream JSON response to avoid OOM from JSON.stringify on large base64 image data
        res.setHeader('Content-Type', 'application/json');
        res.write('{"images":[');
        for (let i = 0; i < generatedImages.length; i++) {
            if (i > 0) res.write(',');
            res.write(JSON.stringify(generatedImages[i]));
        }
        const message = failedCount > 0
            ? `Generated ${successCount} of ${numberOfImages} images (${failedCount} failed and were skipped)`
            : 'Batch image generation completed successfully';
        res.write(`],"totalGenerated":${successCount},"totalRequested":${numberOfImages},"failedCount":${failedCount},"message":${JSON.stringify(message)}}`);
        res.end();

    } catch (error) {
        console.error('[Batch Images] Error:', error.message);
        res.status(500).json({
            error: error.message || 'Failed to generate batch images',
            details: error.message
        });
    }
});

// Proxy endpoint for thumbnail refinement
// Note: The @google/genai SDK doesn't have direct image editing yet
// We use Gemini Vision to analyze the image + edit request, then regenerate
app.post('/api/gemini/refine-thumbnail', async (req, res) => {
    try {
        const { base64ImageData, prompt } = req.body;

        if (!base64ImageData || !prompt) {
            return res.status(400).json({
                error: 'Missing required fields: base64ImageData, prompt'
            });
        }

        console.log('[Backend Thumbnail] Refining thumbnail with edit request:', prompt.substring(0, 100));

        // Step 1: Use Gemini Vision to understand the image and the edit request
        const visionModel = 'gemini-2.0-flash-exp';

        const analysisPrompt = `You are an expert at analyzing and refining YouTube thumbnails. Look at this thumbnail image and the user's edit request.

USER'S EDIT REQUEST: "${prompt}"

Your task:
1. Describe what you see in the current thumbnail in detail
2. Apply the user's requested edit/change to the description
3. Create a NEW detailed image generation prompt that incorporates the edit

IMPORTANT RULES:
- Keep all the good elements from the original thumbnail EXCEPT what the user wants to change
- Maintain the dramatic, high-quality YouTube thumbnail aesthetic (vibrant colors, cinematic lighting, 16:9 composition)
- Be specific about colors, lighting, composition, and style
- DO NOT include any text in the image
- Focus on making the edit feel natural and seamless

Return ONLY the final image generation prompt for Imagen, nothing else.`;

        console.log('[Backend Thumbnail] Analyzing image and edit request with Gemini Vision...');

        const visionResponse = await geminiClient.models.generateContent({
            model: visionModel,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: 'image/png',
                        },
                    },
                    {
                        text: analysisPrompt,
                    },
                ],
            },
        });

        const refinedPrompt = visionResponse.text.trim();
        console.log('[Backend Thumbnail] Generated refined prompt:', refinedPrompt.substring(0, 200));

        // Step 2: Generate the refined image with Imagen
        console.log('[Backend Thumbnail] Generating refined thumbnail with Imagen...');

        const imageModel = 'imagen-4.0-generate-001';

        const imageResponse = await geminiClient.models.generateImages({
            model: imageModel,
            prompt: refinedPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '16:9',
                outputMimeType: 'image/png',
            }
        });

        const imageData = imageResponse.generatedImages[0]?.image?.imageBytes;

        if (!imageData) {
            throw new Error('Image refinement failed to return an image.');
        }

        console.log('[Backend Thumbnail] Successfully refined thumbnail');

        res.json({ imageBytes: imageData });
    } catch (error) {
        console.error('[Backend Thumbnail] Refinement error:', error.message);
        res.status(500).json({
            error: error.message || 'Failed to refine thumbnail'
        });
    }
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Network access: Other devices can connect using your computer's IP address`);
});

// CRITICAL: Set timeouts to 1 hour for long audio synthesis
// Defaults are way too short (60-120 seconds)
server.setTimeout(60 * 60 * 1000); // Main server timeout: 1 hour
server.keepAliveTimeout = 61 * 60 * 1000; // Keep connections alive: 61 minutes (slightly more than timeout)
server.headersTimeout = 62 * 60 * 1000; // Headers timeout: 62 minutes (slightly more than keepAlive)
console.log('[Init] Server timeout set to 1 hour for long audio operations');
console.log('[Init] Keep-alive timeout: 61 minutes');
console.log('[Init] Headers timeout: 62 minutes');
