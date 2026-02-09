# ⚠️ YOU MUST RESTART THE SERVER ⚠️

## The Error You're Seeing

```
Error: totalTime is not defined
POST http://localhost:3001/api/tts/synthesize-long-audio 500
```

## Why This Happens

Your server is **still running the OLD code** without the timeout fixes. The old code doesn't have the `totalTime` variable that the new code returns.

## How to Fix (Choose ONE Method)

### Method 1: Use the Restart Script (Easiest)

**Double-click this file:**
```
restart-server.bat
```

It will:
1. Kill all Node processes
2. Wait 2 seconds
3. Start the server in a new window
4. Show you confirmation

### Method 2: Task Manager (Visual)

1. Press `Ctrl+Shift+Esc` (open Task Manager)
2. Go to **Details** tab
3. Find ALL `node.exe` processes
4. Right-click each one → **End Task**
5. Close Task Manager
6. Open a terminal in the `server` folder
7. Run: `npm start`

### Method 3: Command Line (Quick)

Open Command Prompt as Administrator:

```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Wait a moment
timeout /t 2

# Go to server folder
cd C:\Users\XPS_13\OneDrive\Desktop\youtube-stories\server

# Start server
npm start
```

### Method 4: Close Everything (Safest)

1. Close VSCode
2. Close all terminal windows
3. Close your browser
4. Reopen VSCode
5. Open terminal in `server` folder
6. Run: `npm start`
7. Open your app in browser

## Verify the Fix Worked

After restarting, you MUST see these lines in the server logs:

```
[Init] Using service account key file: ./service-account-key.json
🚀 Backend server running on http://localhost:3001
[Init] Server timeout set to 1 hour for long audio operations
[Init] Keep-alive timeout: 61 minutes
[Init] Headers timeout: 62 minutes
```

**If you DON'T see the last 3 lines**, the old server is still running somewhere.

## How to Be SURE All Node Processes Are Killed

**Check if any Node processes are running:**
```bash
tasklist | findstr node
```

If you see ANY output, Node is still running. Kill them all:
```bash
taskkill /F /IM node.exe
```

Repeat the check until you see NO output.

## Why This Matters

The fixes we made include:
1. ✅ gRPC client timeout: 1 hour
2. ✅ Express server timeout: 1 hour
3. ✅ Keep-alive timeout: 61 minutes
4. ✅ Headers timeout: 62 minutes
5. ✅ Progress tracking with elapsed time
6. ✅ Better error handling

**None of these work until you restart the server!**

## After Restart

1. ✅ Server should start successfully
2. ✅ You'll see the new timeout log messages
3. ✅ Try generating audio again
4. ✅ Should now show progress bar and timer
5. ✅ Should complete successfully for 50k character stories

## Still Getting the Error?

If you STILL get `totalTime is not defined` after restarting:

1. **Verify server logs show the new messages** (see "Verify the Fix Worked" above)
2. **Hard refresh your browser** (Ctrl+Shift+R or Ctrl+F5)
3. **Clear browser cache** for localhost
4. **Check you're running the server from the correct folder** (`youtube-stories/server`)

## Quick Test

After restarting, your progress bar should look like this:

```
[Generating...] ⟳

━━━━━━━━━━░░░░░░░░░░░░░░

Progress: 23%                          1:45 / ~7:30
Time remaining: ~5:45
```

If you see this, everything is working! 🎉

---

**TL;DR:**
1. Close everything or run `taskkill /F /IM node.exe`
2. Start server: `cd server && npm start`
3. Verify you see the 3 new timeout log messages
4. Try generating audio again
