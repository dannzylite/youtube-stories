# Service Account Setup for Long Audio Synthesis

The `synthesizeLongAudio` API requires **service account credentials**, not just an API key. Follow these steps:

## Quick Setup (5 minutes)

### Step 1: Create Service Account

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Make sure you're in project: **gen-lang-client-0624023308**
3. Click **Create Service Account**
4. Enter name: `tts-service-account`
5. Click **Create and Continue**

### Step 2: Grant Permissions

Add these 3 roles:
- **Cloud Text-to-Speech API User**
- **Storage Object Admin** (or at minimum: Creator + Viewer)

Click **Continue**, then **Done**

### Step 3: Create JSON Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key > Create New Key**
4. Select **JSON** format
5. Click **Create**
6. A JSON file will download automatically

### Step 4: Save the Key File

1. Rename the downloaded file to: `service-account-key.json`
2. Move it to: `youtube-stories/server/service-account-key.json`

**Example location:**
```
youtube-stories/
├── server/
│   ├── service-account-key.json  ← Put it here!
│   ├── index.js
│   └── .env
```

### Step 5: Restart Server

```bash
cd server
npm start
```

## ✅ That's It!

The code is already configured to use the service account file. Just restart your server and try generating audio again!

## Security Notes

- ⚠️ **Never commit the JSON key file to Git** (it's already in `.gitignore`)
- ⚠️ **Don't share the key file** - it provides full access to your GCP project
- ✅ If the key is compromised, delete it in the GCP console and create a new one

## Troubleshooting

### Error: "Cannot find module './service-account-key.json'"

- Make sure the file is in the `server/` directory
- Check the filename is exactly: `service-account-key.json`
- Restart your server

### Error: "PERMISSION_DENIED"

- Make sure you granted the correct roles (Text-to-Speech User + Storage Object Admin)
- Wait 1-2 minutes for permissions to propagate
- Restart your server

### Alternative: Use Environment Variable

Instead of placing the file in the `server/` directory, you can set an environment variable:

**Windows:**
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account-key.json
```

**Mac/Linux:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

Or add to your `server/.env`:
```env
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\YourName\path\to\service-account-key.json
```

## Next Steps

Once you have the service account setup:

1. ✅ Restart your backend server
2. ✅ Try generating audio from a story
3. ✅ Check the server logs for `[Long Audio TTS]` messages
4. ✅ Audio should download automatically when complete!

## What Happens Behind the Scenes

When you click "Generate Audio":
1. Frontend sends story text to backend
2. Backend calls `synthesizeLongAudio` API
3. Audio is generated and saved to your GCS bucket (`youtube-stories-audio`)
4. Backend downloads the audio file
5. Backend deletes the file from GCS (cleanup)
6. Audio is sent to frontend as base64
7. Frontend converts to WAV and downloads to your computer

Total time: Usually 30 seconds - 3 minutes depending on story length.
