import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { AnalysisData, TitleSuggestion, BackgroundSuggestion } from '../types';

if (!process.env.API_KEY) {
    // This is a safeguard; the environment is expected to have the API key.
    console.error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    
    const response = await ai.models.generateContent({
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
    
    const response = await ai.models.generateContent({
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

    const response = await ai.models.generateContent({
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
        finalUserPrompt += `\n\nIMPORTANT INSTRUCTION: Write the first part of the story, approximately 9,000 words long. End on a compelling cliffhanger to set up the second part. This is part 1 of 2.`;
    } else { // This will be generation 2
        finalUserPrompt += `\n\nIMPORTANT INSTRUCTION: This is the second and FINAL part of the story. Write a satisfying conclusion. Generate approximately 9,000 more words, but the total final story length MUST NOT exceed 19,000 words under any circumstances. Conclude the entire narrative in this part.`;
    }


    promptContext += `
    Your current instruction is: "${finalUserPrompt}"
    
    IMPORTANT: Only return the new text you generate for this part. Do NOT repeat any of the previous story. Do NOT add any conversational text or introductory phrases like "Here is the next part:". Just write the story content.`;
    
    const response = await ai.models.generateContent({
        model,
        contents: promptContext,
    });
    
    const storyPartText = response.text;
    // The story is considered complete after the second generation.
    const isComplete = generationNumber >= 2;

    return { storyPart: storyPartText.trim(), isComplete };
}

async function generateSpeech(text: string): Promise<Uint8Array> {
    const model = "gemini-2.5-flash-preview-tts";
    
    const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
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

export async function generateSpeechFromLongText(
    text: string, 
    onProgress: (progress: number, total: number) => void
): Promise<Uint8Array> {
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
        const audioData = await generateSpeech(chunks[i]);
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