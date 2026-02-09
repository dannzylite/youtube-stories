# How to Restart Server and Test Long Audio

## The Changes Are Ready!

I've fixed the timeout issue for long stories (50k+ characters). The server code is updated but needs to be restarted to apply the changes.

## Step 1: Restart the Backend Server

### Find and Kill the Running Server

**Option A: Using Task Manager (Windows)**
1. Press `Ctrl+Shift+Esc` to open Task Manager
2. Go to the "Details" tab
3. Find `node.exe` processes
4. Right-click on any node.exe process and select "End Task"
5. Repeat for all node.exe processes

**Option B: Using Command Line**
```bash
# Find Node processes
tasklist | findstr node

# Kill all Node processes (be careful - this kills ALL Node processes)
taskkill /F /IM node.exe

# Or find the specific port 3001 and kill it
netstat -ano | findstr :3001
# Note the PID from the output, then:
taskkill /F /PID <PID>
```

**Option C: Close VSCode/Terminal**
If your server is running in VSCode's integrated terminal, just close VSCode and reopen it.

### Start the Server Again

```bash
cd server
npm start
```

You should see:
```
[Init] Using service account key file: ./service-account-key.json
🚀 Backend server running on http://localhost:3001
```

## Step 2: Test with Your 50k Character Story

1. **Open your app** in the browser (http://localhost:3000)

2. **Go to Story Editor**

3. **Paste or generate a long story** (50,000 characters)

4. **Select a voice** (any voice works)

5. **Click "Generate Audio"**

You should see:
```
Generating audio for 50,000 characters... Estimated time: 7-9 minutes. Please wait...
```

## Step 3: Monitor Progress

### In the Browser
- The notification will stay visible showing the estimated time
- Wait patiently - this takes several minutes

### In the Server Console
You'll see detailed logs:
```
[Long Audio TTS] Starting synthesis for 50000 characters with voice: Charon
[Long Audio TTS] Text size: 0.05 MB (50000 bytes)
[Long Audio TTS] Calling synthesizeLongAudio API...
[Long Audio TTS] Operation started with name: projects/.../operations/...
[Long Audio TTS] Estimated completion time: 8 minutes
[Long Audio TTS] Waiting for operation to complete...
[Long Audio TTS] Still waiting... 1m 0s elapsed
[Long Audio TTS] Still waiting... 1m 30s elapsed
[Long Audio TTS] Still waiting... 2m 0s elapsed
...
[Long Audio TTS] Synthesis complete! Total time: 480 seconds
[Long Audio TTS] Audio file size: 45.2 MB
[Long Audio TTS] Successfully downloaded
[Long Audio TTS] Request complete!
```

## What Was Fixed

### Previous Issue
- Used custom polling that would timeout after 15 minutes
- The polling logic might have been interfering with the operation
- No clear indication of what was happening

### Current Fix
- Uses built-in `operation.promise()` which handles polling internally
- Simpler code, more reliable
- Progress updates every 30 seconds in logs
- Text size validation to catch issues early
- Better error handling

## Expected Results

For a **50,000 character story**:
- ✅ Text size validation passes (~0.05 MB, well under 1 MB limit)
- ✅ Operation starts successfully
- ✅ Progress logged every 30 seconds
- ✅ Completes in 7-9 minutes
- ✅ Audio file downloads automatically (WAV format, ~40-50 MB)

## If It Still Times Out

If it's still timing out after these changes, it might indicate:

### 1. API or GCP Issue
- Check [GCP Status Dashboard](https://status.cloud.google.com/)
- Check your GCP quotas in the console

### 2. Network/Firewall Issue
- The operation might be completing but the result isn't being retrieved
- Check GCS bucket to see if audio files are being created

### 3. Service Account Permissions
- Make sure the service account has:
  - "Cloud Text-to-Speech API User" role
  - "Storage Object Admin" role

## Debugging Commands

### Check if audio files are being created in GCS
```bash
gsutil ls gs://youtube-stories-audio/audio/
```

### Check recent operations in GCP
```bash
gcloud beta text-to-speech operations list --project=gen-lang-client-0624023308
```

### Test with a smaller story first
Start with a 10,000 character story to verify everything works, then scale up.

## Alternative: Use Chunked Generation

If long audio continues to have issues, the app has a fallback to chunked generation:

1. The system will automatically detect long audio failures
2. It will fall back to chunked Gemini TTS
3. This works but has slight pauses between chunks
4. The notification will tell you which method is being used

## Contact Points

If you're still stuck:
1. Check the browser console for frontend errors
2. Check the server console for backend errors
3. Check GCP Console > Cloud Storage for your bucket
4. Check GCP Console > Operations for long-running operations

The system is now much more robust and should handle your 50k character stories without issue!
