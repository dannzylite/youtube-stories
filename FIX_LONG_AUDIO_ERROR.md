# Fix for Long Audio Synthesis Error

## Error You're Seeing

```
POST http://localhost:3001/api/tts/synthesize-long-audio 500 (Internal Server Error)
INTERNAL: SpeechErrorSpace::TTS_BACKEND_REQUEST_RPC_ERROR
```

## Root Cause

The Google Cloud Text-to-Speech Long Audio API requires:
1. The Cloud Text-to-Speech API to be enabled in your GCP project
2. The GCS bucket to exist
3. Proper IAM permissions on the service account

## Step-by-Step Fix

### Step 1: Enable the Cloud Text-to-Speech API

1. Go to [Google Cloud Console APIs](https://console.cloud.google.com/apis/library)
2. Make sure you're in project: **gen-lang-client-0624023308**
3. Search for "Cloud Text-to-Speech API"
4. Click on it and click **ENABLE**
5. Wait 1-2 minutes for the API to be fully enabled

### Step 2: Create the GCS Bucket

1. Go to [Cloud Storage Buckets](https://console.cloud.google.com/storage/browser)
2. Make sure you're in project: **gen-lang-client-0624023308**
3. Click **CREATE BUCKET**
4. Enter name: `youtube-stories-audio` (exactly as shown - must match the .env file)
5. Choose location: **us-central1** (or your preferred region)
6. Storage class: **Standard**
7. Access control: **Uniform**
8. Click **CREATE**

### Step 3: Grant Service Account Permissions

Your service account email: `tts-service-account@gen-lang-client-0624023308.iam.gserviceaccount.com`

#### Option A: Grant Permissions via IAM Console (Recommended)

1. Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/iam)
2. Make sure you're in project: **gen-lang-client-0624023308**
3. Find the service account: `tts-service-account@gen-lang-client-0624023308.iam.gserviceaccount.com`
4. Click the pencil icon (Edit) next to it
5. Click **ADD ANOTHER ROLE** and add these roles:
   - **Cloud Text-to-Speech API User** (or `roles/texttospeech.user`)
   - **Storage Object Admin** (or `roles/storage.objectAdmin`)
6. Click **SAVE**

#### Option B: Grant Permissions via Command Line (Faster)

```bash
# Set your project ID
gcloud config set project gen-lang-client-0624023308

# Grant Text-to-Speech API access
gcloud projects add-iam-policy-binding gen-lang-client-0624023308 \
  --member="serviceAccount:tts-service-account@gen-lang-client-0624023308.iam.gserviceaccount.com" \
  --role="roles/texttospeech.user"

# Grant Storage access
gcloud projects add-iam-policy-binding gen-lang-client-0624023308 \
  --member="serviceAccount:tts-service-account@gen-lang-client-0624023308.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Step 4: Verify Your Setup

Check your configuration files:

**server/.env** should have:
```env
GCP_PROJECT_ID=gen-lang-client-0624023308
GCS_BUCKET_NAME=youtube-stories-audio
```

**server/service-account-key.json** should exist and contain valid credentials.

### Step 5: Restart Your Backend Server

1. Stop the backend server (Ctrl+C if running)
2. Start it again:
   ```bash
   cd server
   npm start
   ```

3. You should see this log message:
   ```
   [Init] Using service account key file: ./service-account-key.json
   ```

### Step 6: Test the Fix

1. Go to your app in the browser
2. Open the Story Editor
3. Generate or paste a story
4. Select a voice
5. Click **Generate Audio**
6. Watch the backend console logs for detailed information

## Expected Logs (Success)

```
[Long Audio TTS] Starting synthesis for 5000 characters with voice: Charon
[Long Audio TTS] Project ID: gen-lang-client-0624023308
[Long Audio TTS] GCS Bucket: youtube-stories-audio
[Long Audio TTS] Voice mapping - Input: Charon, Output: en-US-Neural2-D
[Long Audio TTS] Calling synthesizeLongAudio API...
[Long Audio TTS] Operation started, waiting for completion...
[Long Audio TTS] Synthesis complete!
[Long Audio TTS] Cleaned up GCS file
```

## Expected Logs (Errors)

The enhanced error handling will now show you exactly what's wrong:

- **Permission Denied**: API not enabled or service account lacks permissions
- **Invalid Argument**: Bucket doesn't exist or voice name is invalid
- **Not Found**: GCS bucket doesn't exist

## Still Having Issues?

### Check API Status
```bash
gcloud services list --enabled --project=gen-lang-client-0624023308 | grep texttospeech
```

Should show:
```
texttospeech.googleapis.com     Cloud Text-to-Speech API
```

### Check Bucket Exists
```bash
gsutil ls -p gen-lang-client-0624023308
```

Should show:
```
gs://youtube-stories-audio/
```

### Check Service Account Roles
```bash
gcloud projects get-iam-policy gen-lang-client-0624023308 \
  --flatten="bindings[].members" \
  --filter="bindings.members:tts-service-account@gen-lang-client-0624023308.iam.gserviceaccount.com"
```

Should show roles including:
- `roles/texttospeech.user`
- `roles/storage.objectAdmin`

## Alternative: Use Fallback Method

If you can't get the Long Audio API working right away, the app will automatically fall back to the chunked generation method (using Gemini TTS). It works but has these limitations:

- Audio is split into chunks
- May have slight pauses between chunks
- Takes longer to generate

The fallback is triggered automatically when long audio synthesis fails, so your app will still work!

## What Changed in the Code

I fixed the following issues:

1. **Client Import**: Changed from direct import to namespace import (`textToSpeech.v1.TextToSpeechLongAudioSynthesizeClient`)
2. **Error Handling**: Added comprehensive error logging to diagnose issues
3. **Helpful Messages**: The error messages now tell you exactly what to fix

## Cost Estimate

With Neural2 voices (high quality):
- $16 per 1 million characters
- A 5,000 character story costs ~$0.08
- Storage is negligible (files deleted immediately)

## Questions?

Check the official docs:
- [Text-to-Speech Long Audio](https://cloud.google.com/text-to-speech/docs/create-audio-text-long-audio-synthesis)
- [Node.js Client Library](https://cloud.google.com/nodejs/docs/reference/text-to-speech/latest)
