import type { AnalysisData, TitleSuggestion, BackgroundSuggestion, YouTubeMetadata } from '../types';

// Dynamically determine API URL based on current hostname for network access
const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Use the same hostname as the frontend, but on port 3001
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
};

/**
 * Makes a request to the backend API proxy
 * For long audio synthesis, this needs to wait up to 1 hour
 */
async function callBackendAPI(endpoint: string, body: any) {
    const apiBaseUrl = getApiBaseUrl(); // Get URL at request time, not module load time

    // Create an AbortController for timeout (set to 2 hours for long Gemini Pro TTS operations)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2 * 60 * 60 * 1000); // 2 hour timeout

    try {
        const response = await fetch(`${apiBaseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal, // Add abort signal
            // Disable default timeouts
            keepalive: false, // Don't use keepalive for long requests
        });

        clearTimeout(timeoutId); // Clear timeout on successful response

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }

        return response.json();
    } catch (error: any) {
        clearTimeout(timeoutId);

        // Provide better error messages for timeout/abort
        if (error.name === 'AbortError') {
            throw new Error('Request timeout after 2 hours - this should not happen for long audio synthesis');
        }
        throw error;
    }
}

export async function analyzeTranscript(transcript: string, title: string, imageFile?: File): Promise<AnalysisData> {
    const textPart = {
        text: `Analyze the following transcript and its title to identify the key narrative elements.
        Title: ${title}
        Transcript:
        ---
        ${transcript}
        ---
        Based on this, provide a concise summary, a list of key points, main characters, prevalent themes, and the story's setting.
        `
    };

    let imagePart = null;
    if (imageFile) {
        const base64EncodedData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result.split(',')[1]);
                } else {
                    reject(new Error("Failed to read file as data URL."));
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(imageFile);
        });

        imagePart = {
            inlineData: {
                data: base64EncodedData,
                mimeType: imageFile.type
            }
        };
    }

    const parts = [];
    if (imagePart) parts.push(imagePart);
    parts.push(textPart);

    const data = await callBackendAPI('/api/gemini/generate', {
        model: 'gemini-2.0-flash-exp',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    summary: { type: 'STRING', description: "A concise summary of the transcript." },
                    keyPoints: {
                        type: 'ARRAY',
                        items: { type: 'STRING' },
                        description: "A list of key plot points or events."
                    },
                    characters: {
                        type: 'ARRAY',
                        items: { type: 'STRING' },
                        description: "A list of main characters mentioned."
                    },
                    themes: {
                        type: 'ARRAY',
                        items: { type: 'STRING' },
                        description: "A list of prevalent themes in the story."
                    },
                    setting: { type: 'STRING', description: "The primary setting of the story." },
                },
                required: ["summary", "keyPoints", "characters", "themes", "setting"]
            }
        }
    });

    return JSON.parse(data.text) as AnalysisData;
}

export async function generateTitleSuggestions(analysis: AnalysisData, transcript: string, originalTitle: string, userPrompt: string): Promise<TitleSuggestion[]> {
    const prompt = `Based on the following story analysis, transcript, original title, and the user's creative direction, generate 3-5 compelling and creative alternative titles. For each title, provide a short reasoning.

    User's Creative Direction: "${userPrompt}"

    Original Title: ${originalTitle}

    Analysis:
    - Summary: ${analysis.summary}
    - Key Points: ${analysis.keyPoints.join(', ')}
    - Characters: ${analysis.characters.join(', ')}
    - Themes: ${analysis.themes.join(', ')}
    - Setting: ${analysis.setting}

    Transcript excerpt:
    ${transcript.substring(0, 1000)}...
    `;

    const data = await callBackendAPI('/api/gemini/generate', {
        model: 'gemini-2.5-flash-preview-05-20',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        title: { type: 'STRING' },
                        reasoning: { type: 'STRING' }
                    },
                    required: ["title", "reasoning"]
                }
            }
        }
    });

    const suggestions = JSON.parse(data.text);
    return suggestions.map((s: any, index: number) => ({...s, id: `title-${index}`}));
}

export async function generateBackgroundSuggestions(analysis: AnalysisData, transcript: string, userPrompt: string): Promise<BackgroundSuggestion[]> {
    const prompt = `Based on the following story analysis, transcript, and the user's creative direction, generate 3 different story backgrounds or synopses. Each should be a short paragraph that sets the scene and introduces the main conflict or premise. Provide a brief reasoning for each background's narrative potential.

    User's Creative Direction: "${userPrompt}"

    Analysis:
    - Summary: ${analysis.summary}
    - Key Points: ${analysis.keyPoints.join(', ')}
    - Characters: ${analysis.characters.join(', ')}
    - Themes: ${analysis.themes.join(', ')}
    - Setting: ${analysis.setting}

    Transcript excerpt:
    ${transcript.substring(0, 1000)}...
    `;

    const data = await callBackendAPI('/api/gemini/generate', {
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        background: { type: 'STRING' },
                        reasoning: { type: 'STRING' }
                    },
                    required: ["background", "reasoning"]
                }
            }
        }
    });

    const suggestions = JSON.parse(data.text);
    return suggestions.map((s: any, index: number) => ({...s, id: `bg-${index}`}));
}

export async function generateStoryPart(title: string, background: string, transcript: string, userPrompt: string, existingStory: string, generationNumber: number): Promise<{ storyPart: string, isComplete: boolean }> {
    let partInstruction = '';
    if (generationNumber === 1) {
        partInstruction = `This is part 1 of 2. End on a compelling cliffhanger or natural break.`;
    } else {
        partInstruction = `This is part 2 of 2 - the FINAL part. Write a satisfying conclusion.`;
    }

    let promptContext = `You are a master storyteller writing a LONG-FORM story.

=== USER'S REQUIREMENTS (MUST BE FOLLOWED EXACTLY) ===
${userPrompt}
=== END OF REQUIREMENTS ===

⚠️ CRITICAL LENGTH REQUIREMENT ⚠️
The user has specified EXACT word count requirements in their prompt above.
- If they ask for 8000 words, you MUST write approximately 8000 words (7500-8500 range)
- If they ask for a long-form story, write AT LEAST 7000-8000 words per part
- DO NOT write short summaries or abbreviated versions
- DO NOT stop early - write the FULL length requested
- ${partInstruction}

CRITICAL WRITING INSTRUCTIONS:
- This is a FULL, DETAILED, LONG-FORM story - not a summary or outline
- Follow ALL requirements above: word count, tone, style, pacing, dialogue, structure
- If specific writing style or narrative choices are mentioned, follow them precisely
- Write complete scenes with full dialogue and cinematic detail

Context for your story:

Title: ${title}

Background/Synopsis: ${background}

Reference Transcript (use only as loose inspiration for plot/characters):
---
${transcript.substring(0, 2000)}...
---
`;

    if (existingStory) {
        const storyStart = existingStory.substring(0, 400);
        const storyEnd = existingStory.substring(existingStory.length - 400);

        promptContext += `
Previous Story Content (continue seamlessly from this):
---
Beginning: ${storyStart}
...
Most Recent: ${storyEnd}
---
`;
    }

    promptContext += `
OUTPUT REQUIREMENTS:
- Write the COMPLETE, FULL-LENGTH story as specified in the user's requirements
- Write ONLY the story text - NO meta-commentary, NO introductions
- NO repeating previous content
- Match the EXACT word count specified by the user
- Follow every single requirement from the user's prompt above

Begin writing the FULL story now (remember: write the complete length requested):`;

    const data = await callBackendAPI('/api/gemini/generate', {
        model: 'gemini-2.5-flash-preview-05-20',
        contents: promptContext,
        config: {
            maxOutputTokens: 20000,
        }
    });

    const storyPartText = data.text;
    const isComplete = generationNumber >= 2;

    return { storyPart: storyPartText.trim(), isComplete };
}

export async function generateThumbnail(story: string, title: string, userPrompt?: string): Promise<string> {
    const storySummary = story.substring(0, 1500);

    const prompt = userPrompt?.trim()
        ? userPrompt
        : `Create a viral, clickbait-style YouTube thumbnail for a video titled "${title}". The story is about: "${storySummary}...". The thumbnail should be hyper-realistic with cinematic lighting, vibrant and saturated colors, and a dramatic composition that creates mystery and intrigue. Focus on a close-up of a character's emotional reaction or a pivotal object from the story. DO NOT INCLUDE ANY TEXT. The style should be similar to top-performing narrative videos on YouTube.`;

    const data = await callBackendAPI('/api/gemini/generate-image', {
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/png',
        }
    });

    return data.imageBytes;
}

export async function generateYouTubeMetadata(story: string, title: string, channelName: string): Promise<YouTubeMetadata> {
    const storySummary = story.substring(0, 4000);
    const prompt = `You are an expert YouTube scriptwriter and marketer specializing in viral storytelling. Your task is to write a compelling YouTube video description and tags based on the provided title, channel name, and story summary.

    You must generate a JSON object with two keys: "description" and "tags".

    INSTRUCTIONS FOR THE 'description' FIELD:
    The description MUST follow this exact 5-part structure and tone:
    1.  **Opening Hook (1-2 sentences):** Start with a dramatic, high-stakes sentence that summarizes the core conflict and grabs the viewer's attention immediately.
    2.  **Emotional Teaser (1-2 sentences):** Follow up with a sentence that hints at the deeper emotional journey, the stakes, and the themes of the story (e.g., "This isn't just a story about X, it's about Y and Z.").
    3.  **Call to Watch (1 sentence):** A short, intriguing sentence encouraging viewers to watch until the end (e.g., "💔 Watch till the end to see...").
    4.  **Call to Subscribe (1 sentence):** A clear call to subscribe to the user's channel. The channel name is: "${channelName}". The CTA should be tailored to the type of content (e.g., "📺 Subscribe to ${channelName} for more emotional stories...").
    5.  **Hashtags:** A single line of 5-10 relevant, space-separated hashtags (e.g., #billionaire #romance #drama).

    **CRITICAL FORMATTING RULES FOR 'description':**
    - Use two newlines (\\n\\n) to create a visible empty line between each of the first 4 parts.
    - The hashtags (part 5) MUST also be separated from the 'Call to Subscribe' (part 4) by two newlines.

    INSTRUCTIONS FOR THE 'tags' FIELD:
    - Provide a separate JSON array of 5-10 relevant string keywords for the story (without the '#' prefix). These should correspond to the hashtags.

    ---
    **Now, generate the JSON object for the following video:**

    **Title:** "${title}"
    **Channel Name:** "${channelName}"
    **Story Summary:** "${storySummary}..."
    `;

    const data = await callBackendAPI('/api/gemini/generate', {
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    description: { type: 'STRING' },
                    tags: { type: 'ARRAY', items: { type: 'STRING' } }
                },
                required: ["description", "tags"]
            }
        }
    });

    return JSON.parse(data.text) as YouTubeMetadata;
}

// Speech generation via backend API
export async function generateSpeechPreview(voiceName: string, speakingRate: number = 1.0, engine: 'gemini' | 'google-cloud' = 'gemini'): Promise<Uint8Array> {
    const data = await callBackendAPI('/api/gemini/generate-speech-preview', {
        voiceName,
        speakingRate,
        engine
    });

    const base64Audio = data.audioData;
    const decodedAudio = atob(base64Audio);
    const len = decodedAudio.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = decodedAudio.charCodeAt(i);
    }
    return bytes;
}

// Long audio synthesis - supports both Gemini TTS and Google Cloud TTS
export async function generateLongAudio(text: string, voiceName: string, engine: 'gemini' | 'google-cloud' = 'gemini', speakingRate: number = 1.0): Promise<Uint8Array> {
    console.log(`[Long Audio] Starting synthesis for ${text.length} characters with voice: ${voiceName} using ${engine} at ${speakingRate}x speed`);

    const data = await callBackendAPI('/api/tts/synthesize-long-audio', {
        text,
        voiceName,
        engine,
        speakingRate
    });

    const base64Audio = data.audioData;
    const decodedAudio = atob(base64Audio);
    const len = decodedAudio.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = decodedAudio.charCodeAt(i);
    }

    console.log(`[Long Audio] Generated ${bytes.length} bytes of audio`);
    return bytes;
}

async function generateSpeech(text: string, voiceName: string, retries = 3): Promise<Uint8Array> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const data = await callBackendAPI('/api/gemini/generate-speech', {
                text,
                voiceName
            });

            const base64Audio = data.audioData;
            const decodedAudio = atob(base64Audio);
            const len = decodedAudio.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = decodedAudio.charCodeAt(i);
            }
            return bytes;
        } catch (error) {
            console.error(`[Voice Generation] Attempt ${attempt}/${retries} failed:`, error);

            if (attempt === retries) {
                throw error; // Re-throw on final attempt
            }

            // Exponential backoff: wait longer between retries
            const backoffMs = attempt * 3000; // 3s, 6s, 9s...
            console.log(`[Voice Generation] Retrying in ${backoffMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }

    throw new Error('Failed to generate speech after all retries');
}

export async function generateSpeechFromLongText(
    text: string,
    voiceName: string,
    onProgress: (progress: number, total: number) => void
): Promise<Uint8Array> {
    const CHUNK_SIZE = 8000; // Balanced chunk size to avoid rate limits while maintaining quality

    console.log(`[Voice Generation] Starting speech generation for text of length: ${text.length}`);

    const chunks: string[] = [];
    let remainingText = text;
    let totalProcessedChars = 0;

    while (remainingText.length > 0) {
        if (remainingText.length <= CHUNK_SIZE) {
            chunks.push(remainingText);
            totalProcessedChars += remainingText.length;
            console.log(`[Voice Generation] Final chunk ${chunks.length}: ${remainingText.length} chars`);
            break;
        }

        let chunk = remainingText.substring(0, CHUNK_SIZE);
        let lastPeriod = chunk.lastIndexOf('.');
        let lastNewline = chunk.lastIndexOf('\n');

        let splitIndex = Math.max(lastPeriod, lastNewline);
        if (splitIndex === -1) {
            splitIndex = CHUNK_SIZE;
        } else {
            splitIndex += 1;
        }

        const currentChunk = remainingText.substring(0, splitIndex);
        chunks.push(currentChunk);
        totalProcessedChars += currentChunk.length;
        console.log(`[Voice Generation] Chunk ${chunks.length}: ${currentChunk.length} chars`);

        remainingText = remainingText.substring(splitIndex);
    }

    console.log(`[Voice Generation] Split into ${chunks.length} chunks. Total characters: ${totalProcessedChars} (original: ${text.length})`);

    if (totalProcessedChars !== text.length) {
        console.error(`[Voice Generation] WARNING: Character count mismatch! Processed ${totalProcessedChars} but original was ${text.length}`);
    }

    const audioChunks: Uint8Array[] = [];
    const totalChunks = chunks.length;

    for (let i = 0; i < totalChunks; i++) {
        onProgress(i + 1, totalChunks);
        console.log(`[Voice Generation] Processing chunk ${i + 1}/${totalChunks}...`);

        // Add delay between requests to avoid rate limiting (except for first chunk)
        if (i > 0) {
            const delayMs = 2000; // 2 second delay between chunks
            console.log(`[Voice Generation] Waiting ${delayMs}ms before processing next chunk...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const audioData = await generateSpeech(chunks[i], voiceName);
        audioChunks.push(audioData);
        console.log(`[Voice Generation] Chunk ${i + 1} generated ${audioData.length} bytes of audio`);
    }

    const totalLength = audioChunks.reduce((acc, val) => acc + val.length, 0);
    const concatenatedAudio = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of audioChunks) {
        concatenatedAudio.set(chunk, offset);
        offset += chunk.length;
    }

    console.log(`[Voice Generation] Complete! Generated ${totalLength} bytes of audio`);

    return concatenatedAudio;
}

// Thumbnail refinement via backend API
export async function refineThumbnail(base64ImageData: string, prompt: string): Promise<string> {
    const data = await callBackendAPI('/api/gemini/refine-thumbnail', {
        base64ImageData,
        prompt
    });

    return data.imageBytes;
}

// Batch image generation
export interface BatchImageResult {
    sceneNumber: number;
    sceneDescription: string;
    imagePrompt: string;
    imageBytes: string;
}

export async function generateBatchImages(
    story: string,
    title: string,
    numberOfImages: number,
    style?: string
): Promise<BatchImageResult[]> {
    console.log(`[Batch Images] Requesting ${numberOfImages} images for story`);

    const data = await callBackendAPI('/api/gemini/batch-generate-images', {
        story,
        title,
        numberOfImages,
        style
    });

    console.log(`[Batch Images] Received ${data.images.length} images`);
    return data.images as BatchImageResult[];
}
