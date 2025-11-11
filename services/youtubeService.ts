// @ts-nocheck
import type { YouTubeAuthState } from '../types';

// --- CONFIGURATION ---
// The Client ID is now read directly from the <meta> tag in index.html.

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"];
// This scope allows the app to upload videos and manage the user's YouTube account.
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const LOCAL_STORAGE_TOKEN_KEY = 'youtube_token';


let gapi;
let google;
let tokenClient;
let gapiLoaded = false;
let gisLoaded = false;
let updateStateCallback: (newState: YouTubeAuthState) => void;

function loadScript(src: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
}

/**
 * Initializes the Google API client and Google Identity Services sequentially and robustly.
 */
export async function init(updateCallback: (newState: YouTubeAuthState) => void, apiKey: string) {
    updateStateCallback = updateCallback;

    const clientIdMeta = document.querySelector('meta[name="google-signin-client_id"]');
    const clientId = clientIdMeta ? clientIdMeta.getAttribute('content') : null;

    if (!clientId || clientId.startsWith('YOUR_CLIENT_ID_HERE')) {
        console.error("FATAL: Google Client ID is not configured in index.html.");
        updateStateCallback({
            state: 'disconnected',
            error: "YouTube integration requires a Google Cloud Client ID. It appears to be missing from index.html."
        });
        return;
    }
    
    if (!apiKey || apiKey.includes('YOUR_GEMINI_API_KEY_HERE')) {
        const errorMsg = 'API Key is missing or is a placeholder. Please add your actual key in the inline script of index.html to enable YouTube integration.';
        console.error(errorMsg);
        updateStateCallback({ state: 'disconnected', error: errorMsg });
        return;
    }

    try {
        // Step 1: Load both Google API scripts in parallel.
        await Promise.all([
            loadScript('https://apis.google.com/js/api.js', 'gapi-script'),
            loadScript('https://accounts.google.com/gsi/client', 'gis-script')
        ]);
        
        gapi = window.gapi;
        google = window.google;

        // Step 2: Load the GAPI client and initialize it. This is an async, callback-based operation that we promisify.
        await new Promise<void>((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: apiKey,
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    resolve();
                } catch (error) {
                    console.error('GAPI client.init error:', error);
                    
                    let specificMessage = 'An unknown error occurred during initialization.';
                    if (error && typeof error === 'object') {
                        // The gapi error object might be at the top level or nested
                        const gapiError = (error as any).error || (error as any).result?.error;
                        if (gapiError) {
                            specificMessage = `Received error code ${gapiError.code}: "${gapiError.message}"`;
                             if (gapiError.errors?.[0]?.reason) {
                                specificMessage += `\nReason: ${gapiError.errors[0].reason}`;
                            }
                        } else {
                            // Fallback for unexpected error structures
                            specificMessage = `Details: ${JSON.stringify(error, null, 2)}`;
                        }
                    } else if (error) {
                        specificMessage = String(error);
                    }

                    const detailedError = `GAPI client init failed for YouTube.\n${specificMessage}\n\nPlease check the following in your Google Cloud project:
1. The "YouTube Data API v3" is enabled for your project.
2. Your API Key is valid and correctly provided.
3. If the key has restrictions, ensure they allow this app's domain. For local testing, it's often easiest to temporarily remove all restrictions.`;
                    reject(new Error(detailedError));
                }
            });
        });
        gapiLoaded = true;

        // Step 3: Initialize the Google Identity Services (GIS) token client.
        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: tokenResponseCallback,
            });
        } catch(e) {
            throw new Error('GIS token client init failed. Check your Client ID in index.html.');
        }
        gisLoaded = true;
        
        // Step 4: Now that both libraries are confirmed ready, check for a persisted auth session.
        checkAuth();

    } catch (error) {
        console.error("Error during Google services initialization", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during setup.';
        updateStateCallback({ state: 'disconnected', error: errorMessage });
    }
}

async function tokenResponseCallback(resp: any) {
    if (resp.error) {
        console.error('Google token error:', resp.error);
        updateStateCallback({ state: 'signed_out', error: `Authentication failed: ${resp.error}` });
        return;
    }
    gapi.client.setToken(resp);
    
    // Persist the token with an expiration timestamp for session management.
    const tokenWithExpiry = {
        ...resp,
        expires_at: Date.now() + (parseInt(resp.expires_in, 10) * 1000)
    };
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, JSON.stringify(tokenWithExpiry));

    await fetchUserInfo();
}

async function fetchUserInfo() {
     try {
        const res = await gapi.client.oauth2.userinfo.get();
        if (res.result && res.result.id) { // Check for a valid user object
            updateStateCallback({
                state: 'signed_in',
                user: {
                    name: res.result.name,
                    email: res.result.email,
                    picture: res.result.picture,
                }
            });
        } else {
             signOut(); // The token is invalid, so sign out.
             updateStateCallback({ state: 'signed_out', error: 'Failed to fetch user profile with the current token.' });
        }
    } catch (error) {
        console.error("Error fetching user info", error);
        signOut(); // The token is invalid, so sign out.
        updateStateCallback({ state: 'signed_out', error: 'Failed to fetch user profile.' });
    }
}

function checkAuth() {
    const tokenString = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (tokenString) {
        const token = JSON.parse(tokenString);
        // Check if the token is expired, giving a 5-minute buffer.
        if (token.expires_at && token.expires_at > Date.now() + (5 * 60 * 1000)) {
            gapi.client.setToken(token);
            fetchUserInfo();
        } else {
            // Token is expired, remove it and update state.
            localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
            updateStateCallback({ state: 'signed_out' });
        }
    } else {
        // No token found.
        updateStateCallback({ state: 'signed_out' });
    }
}

export function signIn() {
    if (!gisLoaded || !gapiLoaded) {
        updateStateCallback({ state: 'disconnected', error: 'Google Sign-In is not ready.' });
        return;
    }
    // Prompt the user to select an account and grant consent.
    tokenClient.requestAccessToken({prompt: 'consent'});
}

export function signOut() {
    const token = gapi.client.getToken();
    if (token) {
        // Revoke the token to invalidate it.
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken(null);
            localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
            updateStateCallback({ state: 'signed_out' });
        });
    } else {
        // If there's no token in gapi, ensure local storage is also clear.
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        updateStateCallback({ state: 'signed_out' });
    }
}

interface UploadDetails {
    videoFile: File;
    thumbnailFile: Blob;
    title: string;
    description: string;
    tags: string[];
}
/**
 * Uploads a video to YouTube using a resumable upload process.
 */
export async function uploadVideo(details: UploadDetails, onProgress: (progress: number) => void): Promise<void> {
    const accessToken = gapi.client.getToken()?.access_token;
    if (!accessToken) {
        throw new Error("User not authenticated. Please sign in first.");
    }

    // --- Step 1: Initiate Resumable Upload for Video ---
    const videoMetadata = {
        snippet: {
            title: details.title,
            description: details.description,
            tags: details.tags,
        },
        status: {
            privacyStatus: 'private', // Upload as private, user can change later
        },
    };

    const videoUploadResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(videoMetadata),
    });

    if (!videoUploadResponse.ok) {
        throw new Error(`Failed to initiate video upload: ${await videoUploadResponse.text()}`);
    }

    const locationUrl = videoUploadResponse.headers.get('Location');
    if (!locationUrl) {
        throw new Error('Could not get resumable upload URL for video.');
    }

    // --- Step 2: Upload Video File ---
    const videoId = await uploadFile(locationUrl, details.videoFile, (progress) => {
        // The video is 95% of the total progress. Thumbnail is the last 5%.
        onProgress(progress * 0.95);
    });

    if (!videoId) {
        throw new Error('Video upload did not return a video ID.');
    }

    // --- Step 3: Upload Thumbnail ---
    onProgress(96);
    await uploadThumbnail(videoId, details.thumbnailFile, accessToken);
    onProgress(100);
}


/**
 * Helper to upload a file to a resumable upload URL and report progress.
 */
function uploadFile(locationUrl: string, file: File, onProgress: (progress: number) => void): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', locationUrl);
        
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentage = (event.loaded / event.total) * 100;
                onProgress(percentage);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.id);
                } catch(e) {
                    // Sometimes the response is empty on success, but we need the video ID.
                    // Let's try to get it from the final response of the resumable upload.
                    // For now, this case seems unlikely with the YouTube API. We will assume the response contains the ID.
                    reject(new Error('Failed to parse video ID from upload response.'));
                }
            } else {
                reject(new Error(`File upload failed with status ${xhr.status}: ${xhr.responseText}`));
            }
        };
        
        xhr.onerror = () => {
            reject(new Error('An error occurred during the XHR request.'));
        };
        
        xhr.send(file);
    });
}

/**
 * Helper to set the custom thumbnail for a video.
 */
async function uploadThumbnail(videoId: string, thumbnailFile: Blob, accessToken: string) {
    const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
        },
        body: thumbnailFile,
    });

    if (!response.ok) {
        console.error(`Failed to set thumbnail: ${await response.text()}`);
        // This is not a fatal error, the video is already uploaded.
    }
}