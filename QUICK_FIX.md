# Quick Fix for 50k Character Stories - START HERE

## The Problem
Your 50k character stories were timing out because of default timeouts (60-120 seconds).

## The Solution (2 Minutes)
I've already fixed the code. You just need to restart your server.

## Step 1: Kill Node Process

**Windows - Task Manager:**
1. Press `Ctrl+Shift+Esc`
2. Go to "Details" tab
3. Find `node.exe` → Right-click → "End Task"
4. Repeat for all node.exe processes

**OR Command Line:**
```bash
taskkill /F /IM node.exe
```

**OR Just Close:**
- Close VSCode
- Close all terminal windows

## Step 2: Restart Server

```bash
cd server
npm start
```

## Step 3: Verify Fix Applied

You MUST see these new log messages:
```
[Init] Using service account key file: ./service-account-key.json
🚀 Backend server running on http://localhost:3001
[Init] Server timeout set to 1 hour for long audio operations
[Init] Keep-alive timeout: 61 minutes
[Init] Headers timeout: 62 minutes
```

**If you DON'T see these messages**, the fix hasn't been applied. Make sure you:
1. Actually killed all Node processes
2. Restarted from the correct directory

## Step 4: Test Your 50k Story

1. Open app in browser
2. Go to Story Editor
3. Paste your 50,000 character story
4. Select a voice
5. Click "Generate Audio"
6. **WAIT 7-9 MINUTES** ← This is normal!

## What You'll See

**Browser:**
```
Generating audio for 50,000 characters... Estimated time: 7-9 minutes. Please wait...
```

**Server Console (every 30 seconds):**
```
[Long Audio TTS] Still waiting... 1m 0s elapsed
[Long Audio TTS] Still waiting... 1m 30s elapsed
[Long Audio TTS] Still waiting... 2m 0s elapsed
...
[Long Audio TTS] Synthesis complete! Total time: 450 seconds
[Long Audio TTS] Audio file size: 42.3 MB
```

**Final Result:**
- Audio file automatically downloads
- ~40-50 MB WAV file
- ~50-70 minutes of narration

## What Was Fixed

Three timeout layers were increased from minutes to 1 hour:

1. **gRPC client timeout:** 60s → 1 hour
2. **Express server timeout:** 120s → 1 hour
3. **Keep-alive timeouts:** Set to 61-62 minutes

## That's It!

The fix is done. Just restart your server and test.

## More Details

- [TIMEOUT_FIX_EXPLAINED.md](TIMEOUT_FIX_EXPLAINED.md) - Technical deep dive
- [LONG_STORY_SUPPORT.md](LONG_STORY_SUPPORT.md) - Long story features
- [RESTART_AND_TEST.md](RESTART_AND_TEST.md) - Detailed testing guide

## Still Not Working?

1. Make sure you see the new timeout log messages
2. Check your story is actually 50k chars (not 500k)
3. Check the server console for error messages
4. Make sure GCS bucket exists: `youtube-stories-audio`
5. Make sure service account has proper permissions

---

**TL;DR:** Kill Node, restart server, wait 7-9 minutes. It will work. 🎉
