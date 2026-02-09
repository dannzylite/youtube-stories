# Long Audio Synthesis Setup Guide

This guide will help you set up Google Cloud Text-to-Speech's `synthesizeLongAudio` feature for generating audio from long stories without chunking.

## Benefits

- ✅ **No chunking required** - Handles very long text in a single request
- ✅ **Better audio quality** - Seamless narration without artificial breaks
- ✅ **Simpler code** - No manual chunking, retries, or concatenation needed
- ✅ **Handles unlimited length** - Can process stories of any length

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with billing enabled
3. Text-to-Speech API enabled
4. A Google Cloud Storage bucket

## Setup Steps

### 1. Create/Select a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your **Project ID** (you'll need this later)

### 2. Enable Required APIs

Enable the following APIs in your project:

1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for and enable:
   - **Cloud Text-to-Speech API**
   - **Cloud Storage API**

### 3. Create a Google Cloud Storage Bucket

1. Go to [Cloud Storage > Buckets](https://console.cloud.google.com/storage/browser)
2. Click **Create Bucket**
3. Choose a unique bucket name (e.g., `your-app-name-audio-storage`)
4. Select a location (choose one close to your users)
5. Choose **Standard** storage class
6. Set access control to **Uniform**
7. Click **Create**

### 4. Set Up Authentication

You have two options:

#### Option A: Service Account (Recommended for Production)

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **Create Service Account**
3. Give it a name (e.g., `tts-service-account`)
4. Grant the following roles:
   - **Cloud Text-to-Speech API User**
   - **Storage Object Creator**
   - **Storage Object Viewer**
5. Click **Done**
6. Click on the service account you just created
7. Go to **Keys** tab
8. Click **Add Key > Create New Key**
9. Choose **JSON** format
10. Download the JSON key file
11. Save it securely (e.g., `server/service-account-key.json`)
12. Add to `.gitignore`: `server/service-account-key.json`

Then update `server/index.js` to use the service account:

```javascript
// Replace the initialization code with:
const ttsLongAudioClient = new TextToSpeechLongAudioSynthesizeClient({
    keyFilename: './service-account-key.json'
});

const storage = new Storage({
    keyFilename: './service-account-key.json'
});
```

#### Option B: API Key (Simpler, but less secure)

If you want to use the same API key as Gemini:

1. Make sure your API key has Cloud Text-to-Speech API enabled
2. The current code already uses the `GEMINI_API_KEY` for TTS

**Note**: API keys have limitations and are less secure than service accounts.

### 5. Update Environment Variables

Edit `server/.env` and add your configuration:

```env
# Google Cloud Platform Configuration for Long Audio Synthesis
GCP_PROJECT_ID=your-actual-project-id
GCS_BUCKET_NAME=your-actual-bucket-name
```

Example:
```env
GCP_PROJECT_ID=storyteller-ai-12345
GCS_BUCKET_NAME=storyteller-audio-storage
```

### 6. Restart Your Backend Server

```bash
cd server
npm start
```

## Testing

1. Navigate to the Story Editor in your app
2. Generate or write a story
3. Select a voice
4. Click **Generate Audio**
5. The system will:
   - Try to use `synthesizeLongAudio` first (best quality)
   - Fall back to chunked generation if GCS is not configured

## Troubleshooting

### Error: "GCS_BUCKET_NAME and GCP_PROJECT_ID must be set"

- Make sure you've added the environment variables to `server/.env`
- Restart your backend server after updating `.env`

### Error: "Bucket does not exist"

- Verify the bucket name in `.env` matches exactly what you created in GCS
- Make sure the bucket exists in the same project

### Error: "Permission denied"

- If using a service account, verify it has the correct roles
- If using an API key, make sure Cloud Text-to-Speech API is enabled

### Error: "The caller does not have permission"

- Enable billing for your GCP project
- Make sure Text-to-Speech API is enabled
- Check that your authentication credentials have the right permissions

## Cost Considerations

Google Cloud Text-to-Speech pricing (as of 2025):

- **Standard voices**: $4.00 per 1 million characters
- **Neural2 voices**: $16.00 per 1 million characters
- **Storage**: ~$0.020 per GB per month (files are deleted immediately after download)

For a typical 5,000-character story with Neural2 voices:
- Cost: ~$0.08 per audio generation
- Storage cost: negligible (file is deleted after download)

## Fallback Behavior

The app includes automatic fallback:

1. **First attempt**: Uses `synthesizeLongAudio` (best quality, no chunking)
2. **If GCS not configured**: Automatically falls back to chunked Gemini TTS
3. User sees a notification about which method is being used

This means the app will continue to work even if you don't set up GCS immediately!

## Next Steps

Once you have this working:

1. ✅ Test with short stories first
2. ✅ Test with very long stories (10,000+ characters)
3. ✅ Compare audio quality with the old chunked method
4. ✅ Monitor your GCP billing dashboard

## Additional Resources

- [Cloud Text-to-Speech Documentation](https://cloud.google.com/text-to-speech/docs)
- [synthesizeLongAudio API Reference](https://cloud.google.com/text-to-speech/docs/reference/rest/v1/projects.locations/synthesizeLongAudio)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
