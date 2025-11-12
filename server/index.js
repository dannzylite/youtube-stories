import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini client
const geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
        const { voiceName } = req.body;

        if (!voiceName) {
            return res.status(400).json({
                error: 'Missing required field: voiceName'
            });
        }

        const PREVIEW_TEXT = "Listen to the sound of my voice, and imagine the story I will tell.";
        const model = "gemini-2.5-flash-preview-tts";

        console.log(`[Backend Speech Preview] Attempting to generate speech preview with voice: ${voiceName}`);
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

        console.log('Response received:', JSON.stringify(response, null, 2));

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
            console.error('No audio data in response. Full response:', JSON.stringify(response, null, 2));
            throw new Error(`Could not generate audio preview for voice "${voiceName}". This voice may not be supported by the Gemini TTS API.`);
        }

        res.json({ audioData: base64Audio });
    } catch (error) {
        console.error('Speech preview generation error:', error);
        console.error('Error details:', error.message);
        if (error.response) {
            console.error('API Response:', JSON.stringify(error.response, null, 2));
        }
        res.status(500).json({
            error: error.message || 'Failed to generate speech preview'
        });
    }
});

// Proxy endpoint for full speech generation
app.post('/api/gemini/generate-speech', async (req, res) => {
    try {
        const { text, voiceName } = req.body;

        if (!text || !voiceName) {
            return res.status(400).json({
                error: 'Missing required fields: text, voiceName'
            });
        }

        console.log(`[Backend Speech] Generating speech for ${text.length} characters with voice: ${voiceName}`);
        console.log(`[Backend Speech] Text preview: ${text.substring(0, 100)}...`);

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
                },
            },
        });

        console.log(`[Backend Speech] Response received, checking for audio data...`);

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
            console.error('[Backend Speech] No audio data in response. Full response:', JSON.stringify(response, null, 2));
            throw new Error('Could not generate audio from text.');
        }

        console.log(`[Backend Speech] Successfully generated audio, base64 length: ${base64Audio.length}`);

        res.json({ audioData: base64Audio });
    } catch (error) {
        console.error('[Backend Speech] Speech generation error:', error);
        console.error('[Backend Speech] Error stack:', error.stack);
        if (error.response) {
            console.error('[Backend Speech] API Response:', JSON.stringify(error.response, null, 2));
        }
        res.status(500).json({
            error: error.message || 'Failed to generate speech'
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
        console.error('[Backend Thumbnail] Thumbnail refinement error:', error);
        console.error('[Backend Thumbnail] Error details:', error.message);
        res.status(500).json({
            error: error.message || 'Failed to refine thumbnail'
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
