import type { AnalysisData, TitleSuggestion, BackgroundSuggestion, YouTubeMetadata } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Makes a request to the backend API proxy
 */
async function callBackendAPI(endpoint: string, body: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }

    return response.json();
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
        model: 'gemini-2.5-pro',
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
        model: 'gemini-2.5-flash',
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
        model: 'gemini-2.5-flash',
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
    let promptContext = `You are a master storyteller. Your task is to write a compelling story based on the provided materials. Faithfully adhere to the title, background, and user's creative direction.

    Title: ${title}
    Background / Synopsis: ${background}
    Original Transcript (for high-level context on plot points, characters, and style):
    ---
    ${transcript.substring(0, 2000)}...
    ---
    `;

    if (existingStory) {
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
    } else {
        finalUserPrompt += `\n\nIMPORTANT INSTRUCTION: This is the second and FINAL part of the story. Write a satisfying conclusion to the entire narrative in this part.`;
    }

    promptContext += `
    Your current instruction is: "${finalUserPrompt}"

    IMPORTANT: Only return the new text you generate for this part. Do NOT repeat any of the previous story. Do NOT add any conversational text or introductory phrases like "Here is the next part:". Just write the story content.`;

    const data = await callBackendAPI('/api/gemini/generate', {
        model: 'gemini-2.5-pro',
        contents: promptContext,
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
        model: 'gemini-2.5-flash',
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

// Speech generation functions remain client-side as they use special modalities
export { generateSpeechPreview, generateSpeechFromLongText, refineThumbnail } from './geminiService';
