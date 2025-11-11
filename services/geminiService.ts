import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { AnalysisData, TitleSuggestion, BackgroundSuggestion, YouTubeMetadata } from '../types';

let ai: GoogleGenAI | null = null;
let isInitialized = false;

/**
 * Initializes the GoogleGenAI client instance with a provided API key.
 * This must be called once at application startup.
 */
export function init(apiKey: string): void {
    if (isInitialized) {
        console.warn("Gemini AI client is already initialized.");
        return;
    }
    
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        throw new Error("Gemini AI client cannot be initialized. API Key is missing or a placeholder.");
    }

    try {
        // Initialize the client. This might throw an error if the key is malformed.
        ai = new GoogleGenAI({ apiKey });
        isInitialized = true;
    } catch (error) {
        console.error("Failed to initialize GoogleGenAI client:", error);
        ai = null;
        isInitialized = false;
        // Re-throw a more user-friendly error to be displayed in the UI.
        throw new Error("Failed to initialize Gemini AI. The API Key in env.js might be invalid or malformed.");
    }
}


/**
 * Returns the initialized GoogleGenAI client instance.
 * Throws an error if the client has not been initialized via init().
 */
function getAiClient(): GoogleGenAI {
    if (!isInitialized || !ai) {
        throw new Error("Gemini AI client has not been initialized. Call init() with a valid API key at app startup.");
    }
    return ai;
}


async function fileToGenerativePart(file: File) {
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
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: base64EncodedData,
            mimeType: file.type
        }
    };
}

export async function analyzeTranscript(transcript: string, title: string, imageFile?: File): Promise<AnalysisData> {
    const aiClient = getAiClient();
    const model = 'gemini-2.5-pro';
    
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

    const imagePart = imageFile ? await fileToGenerativePart(imageFile) : null;
    
    const parts = [];
    if (imagePart) parts.push(imagePart);
    parts.push(textPart);
    
    const response = await aiClient.models.generateContent({
        model,
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A concise summary of the transcript." },
                    keyPoints: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "A list of key plot points or events."
                    },
                    characters: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "A list of main characters mentioned."
                    },
                    themes: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "A list of prevalent themes in the story."
                    },
                    setting: { type: Type.STRING, description: "The primary setting of the story." },
                },
                required: ["summary", "keyPoints", "characters", "themes", "setting"]
            }
        }
    });

    const jsonText = response.text;
    return JSON.parse(jsonText) as AnalysisData;
}

export async function generateTitleSuggestions(analysis: AnalysisData, transcript: string, originalTitle: string, userPrompt: string): Promise<TitleSuggestion[]> {
    const aiClient = getAiClient();
    const model = 'gemini-2.5-flash';
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
    
    const response = await aiClient.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["title", "reasoning"]
                }
            }
        }
    });

    const jsonText = response.text;
    const suggestions = JSON.parse(jsonText);
    return suggestions.map((s: any, index: number) => ({...s, id: `title-${index}`}));
}

export async function generateBackgroundSuggestions(analysis: AnalysisData, transcript: string, userPrompt: string): Promise<BackgroundSuggestion[]> {
    const aiClient = getAiClient();
    const model = 'gemini-2.5-flash';
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

    const response = await aiClient.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        background: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["background", "reasoning"]
                }
            }
        }
    });

    const jsonText = response.text;
    const suggestions = JSON.parse(jsonText);
    return suggestions.map((s: any, index: number) => ({...s, id: `bg-${index}`}));
}

export async function generateStoryPart(title: string, background: string, transcript: string, userPrompt: string, existingStory: string, generationNumber: number): Promise<{ storyPart: string, isComplete: boolean }> {
    const aiClient = getAiClient();
    const model = 'gemini-2.5-pro';
    
    let promptContext = `You are a master storyteller. Your task is to write a compelling story based on the provided materials. Faithfully adhere to the title, background, and user's creative direction.

    Title: ${title}
    Background / Synopsis: ${background}
    Original Transcript (for high-level context on plot points, characters, and style):
    ---
    ${transcript.substring(0, 2000)}... 
    ---
    `;

    if (existingStory) {
        // Provide the beginning and the very end of the existing story for context
        const storyStart = existingStory.substring(0, 400);
        const storyEnd = existingStory.substring(existingStory.length - 400);

        promptContext += `
        The story has already begun. Here is the start and the most recent part of the existing story to ensure a seamless continuation:
        ---
        ${storyStart}
        ...
        ${storyEnd}
        ---
        `;
    }
    
    let finalUserPrompt = userPrompt;

    if (generationNumber === 1) {
        finalUserPrompt += `\n\nIMPORTANT INSTRUCTION: Write the first part of the story. End on a compelling cliffhanger or a natural break to set up the second part. This is part 1 of 2.`;
    } else { // This will be generation 2
        finalUserPrompt += `\n\nIMPORTANT INSTRUCTION: This is the second and FINAL part of the story. Write a satisfying conclusion to the entire narrative in this part.`;
    }


    promptContext += `
    Your current instruction is: "${finalUserPrompt}"
    
    IMPORTANT: Only return the new text you generate for this part. Do NOT repeat any of the previous story. Do NOT add any conversational text or introductory phrases like "Here is the next part:". Just write the story content.`;
    
    const response = await aiClient.models.generateContent({
        model,
        contents: promptContext,
    });
    
    const storyPartText = response.text;
    // The story is considered complete after the second generation.
    const isComplete = generationNumber >= 2;

    return { storyPart: storyPartText.trim(), isComplete };
}

async function generateSpeech(text: string, voiceName: string): Promise<Uint8Array> {
    const aiClient = getAiClient();
    const model = "gemini-2.5-flash-preview-tts";
    
    const response = await aiClient.models.generateContent({
        model,
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
        throw new Error("Could not generate audio from text.");
    }

    const decodedAudio = atob(base64Audio);
    const len = decodedAudio.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = decodedAudio.charCodeAt(i);
    }
    return bytes;
}

export async function generateSpeechPreview(voiceName: string): Promise<Uint8Array> {
    const aiClient = getAiClient();
    const model = "gemini-2.5-flash-preview-tts";
    const PREVIEW_TEXT = "Listen to the sound of my voice, and imagine the story I will tell.";
    
    const response = await aiClient.models.generateContent({
        model,
        contents: [{ parts: [{ text: PREVIEW_TEXT }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
        throw new Error("Could not generate audio preview.");
    }

    const decodedAudio = atob(base64Audio);
    const len = decodedAudio.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = decodedAudio.charCodeAt(i);
    }
    return bytes;
}

export async function generateSpeechFromLongText(
    text: string, 
    voiceName: string,
    onProgress: (progress: number, total: number) => void
): Promise<Uint8Array> {
    const aiClient = getAiClient(); // Initialize once
    const CHUNK_SIZE = 20000; // Safe character limit per chunk
    
    const chunks: string[] = [];
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
        if (splitIndex === -1) {
            splitIndex = CHUNK_SIZE;
        } else {
            splitIndex += 1;
        }
        
        chunks.push(remainingText.substring(0, splitIndex));
        remainingText = remainingText.substring(splitIndex);
    }
    
    const audioChunks: Uint8Array[] = [];
    const totalChunks = chunks.length;

    for (let i = 0; i < totalChunks; i++) {
        onProgress(i + 1, totalChunks);
        // We don't need to call getAiClient() here again because `generateSpeech` will
        const audioData = await generateSpeech(chunks[i], voiceName);
        audioChunks.push(audioData);
    }

    const totalLength = audioChunks.reduce((acc, val) => acc + val.length, 0);
    const concatenatedAudio = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of audioChunks) {
        concatenatedAudio.set(chunk, offset);
        offset += chunk.length;
    }

    return concatenatedAudio;
}

export async function generateThumbnail(story: string, title: string, userPrompt?: string): Promise<string> {
    const aiClient = getAiClient();
    const storySummary = story.substring(0, 1500); // Use a summary for the prompt
    
    const prompt = userPrompt?.trim()
        ? userPrompt
        : `Create a viral, clickbait-style YouTube thumbnail for a video titled "${title}". The story is about: "${storySummary}...". The thumbnail should be hyper-realistic with cinematic lighting, vibrant and saturated colors, and a dramatic composition that creates mystery and intrigue. Focus on a close-up of a character's emotional reaction or a pivotal object from the story. DO NOT INCLUDE ANY TEXT. The style should be similar to top-performing narrative videos on YouTube.`;
    
    const response = await aiClient.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/png',
        }
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Thumbnail generation failed.");
    }
    return base64ImageBytes;
}

export async function refineThumbnail(base64ImageData: string, prompt: string): Promise<string> {
    const aiClient = getAiClient();
    const model = 'gemini-2.5-flash-image';
    
    const response = await aiClient.models.generateContent({
        model,
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64ImageData,
                        mimeType: 'image/png',
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return base64ImageBytes;
        }
    }
    
    throw new Error("Image refinement failed to return an image.");
}


export async function generateYouTubeMetadata(story: string, title: string, channelName: string): Promise<YouTubeMetadata> {
    const aiClient = getAiClient();
    const storySummary = story.substring(0, 4000);
    const prompt = `You are an expert YouTube scriptwriter and marketer specializing in viral storytelling. Your task is to write a compelling YouTube video description and tags based on the provided title, channel name, and story summary.

    You must generate a JSON object with two keys: "description" and "tags".

    INSTRUCTIONS FOR THE 'description' FIELD:
    The description MUST follow this exact 5-part structure and tone:
    1.  **Opening Hook (1-2 sentences):** Start with a dramatic, high-stakes sentence that summarizes the core conflict and grabs the viewer's attention immediately.
    2.  **Emotional Teaser (1-2 sentences):** Follow up with a sentence that hints at the deeper emotional journey, the stakes, and the themes of the story (e.g., "This isn’t just a story about X, it’s about Y and Z.").
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

    const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["description", "tags"]
            }
        }
    });

    const jsonText = response.text;
    return JSON.parse(jsonText) as YouTubeMetadata;
}