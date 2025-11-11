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

app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
