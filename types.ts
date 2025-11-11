
export interface AnalysisData {
    summary: string;
    keyPoints: string[];
    characters: string[];
    themes: string[];
    setting: string;
}

export interface TitleSuggestion {
    id: string;
    title: string;
    reasoning: string;
}

export interface BackgroundSuggestion {
    id:string;
    background: string;
    reasoning: string;
}

export interface StoryVersion {
    id: number;
    createdAt: string;
    title: string;
    background: string;
    story: string;
}

export interface IngestData {
    title: string;
    transcript: string;
    imageFile: File | null;
    imageDataUrl: string | null;
}

export interface YouTubeMetadata {
    description: string;
    tags: string[];
}

export type YouTubeUser = {
    name: string;
    email: string;
    picture: string;
};

export type YouTubeAuthState = {
    state: 'disconnected' | 'loading' | 'signed_out' | 'signed_in';
    user?: YouTubeUser;
    error?: string;
};