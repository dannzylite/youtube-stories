# Voice Switching Feature - Intelligent Dialogue Detection

## What Was Changed

I've implemented an intelligent voice switching system that:

1. **Uses the selected narrator voice for ALL narration** - Your chosen voice (e.g., Charon, Kore, etc.) will be used consistently for all non-dialogue text
2. **Automatically detects conversations** - The system identifies when there are multiple consecutive dialogue lines (indicating a conversation between characters)
3. **Switches voices only during conversations** - When a conversation is detected between characters, it alternates between:
   - **Male voice**: en-US-Neural2-J (Strong male voice)
   - **Female voice**: en-US-Neural2-F (Warm female voice)
4. **Single dialogue uses narrator voice** - If there's only one piece of dialogue (not a conversation), it uses your selected narrator voice

## How It Works

### Dialogue Detection
The system parses your story text and:
- Identifies text in quotes (`"dialogue"` or `'dialogue'`) as dialogue
- Everything else is treated as narration

### Conversation Detection
The system uses a smart algorithm to detect conversations:
- Looks for 2 or more dialogue segments within a window of 5 segments
- Ignores long narration breaks (>100 characters) that would break the conversation
- Once a conversation is detected, it alternates between male/female voices

### Example

```
The sun was setting over the horizon. (Narrator Voice - Charon)

"Where are you going?" asked Sarah. (Male Voice - Conversation detected)

"I'm heading home," replied Tom. (Female Voice - Alternating)

"Wait for me!" she called out. (Male Voice - Alternating)

He turned and smiled. (Narrator Voice - Charon)
```

## Important Notes

### Google Cloud TTS (Recommended)
- **FULL voice switching support** ✅
- Each segment gets its own voice
- Conversations use different voices for male/female characters
- Narrator voice is consistent throughout

### Gemini TTS
- **Limited support** ⚠️
- Does NOT support per-segment voice switching
- Uses only the selected narrator voice for everything
- Faster synthesis but no conversation voices

## How to Use

1. **Restart the server** (IMPORTANT):
   ```bash
   cd server
   npm start
   ```
   Or use the restart batch file: `restart-server.bat`

2. **Select "Google Cloud TTS" engine** in the Audio Generation section (for voice switching to work)

3. **Choose your narrator voice** from the dropdown (Charon, Kore, etc.)

4. **Click "Generate Audio"**

5. The system will:
   - Use your selected voice for all narration
   - Automatically detect conversations
   - Switch between male/female voices during conversations
   - Use your narrator voice for single dialogue lines

## Testing the Feature

To test if it's working:

1. Check the backend console logs when generating audio
2. You should see messages like:
   ```
   [Long Audio TTS] Parsing dialogue segments...
   [Long Audio TTS] Found X segments
   [Long Audio TTS] Conversation segments: Y
   [Long Audio TTS] Processing segment 1/X (narration, 50 chars, voice: en-US-Neural2-D)...
   [Long Audio TTS] Processing segment 2/X (dialogue, 20 chars, voice: en-US-Neural2-J)...
   [Long Audio TTS] Processing segment 3/X (dialogue, 25 chars, voice: en-US-Neural2-F)...
   ```

3. Listen to the generated audio - you should hear:
   - Consistent narrator voice throughout narration
   - Different voices (male/female) during conversations

## Troubleshooting

If voices are not switching:

1. **Make sure you selected "Google Cloud TTS"** - Gemini TTS doesn't support voice switching
2. **Restart the server** - Changes only take effect after restart
3. **Check the console logs** - Look for "Parsing dialogue segments" messages
4. **Verify your story has conversations** - You need multiple consecutive dialogue lines

## Technical Details

**Files Modified:**
- [server/index.js](server/index.js) - Added `parseDialogueSegments()` and `assignVoicesToSegments()` functions

**Voice Mapping:**
- Narrator: Your selected voice (mapped to Google Cloud Neural2 voices)
- Conversation Male: en-US-Neural2-J (Strong male voice)
- Conversation Female: en-US-Neural2-F (Warm female voice)

**Algorithm:**
1. Parse text into segments (narration vs dialogue)
2. Detect conversation clusters (2+ dialogues nearby)
3. Assign voices: narrator for narration, alternating male/female for conversations
4. Synthesize each segment with its assigned voice
5. Concatenate all audio segments into final output
