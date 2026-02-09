# Voice System Explanation

Your app uses **TWO different voice systems** depending on which feature is being used:

## 1. Voice Preview (Gemini TTS)
When you click the "Preview" button for a voice, it uses **Gemini TTS API** with these voice names:
- Charon, Kore, Puck, Fenrir, Aoede, Callirrhoe, Orus, Zephyr, Enceladus, Leda

## 2. Long Audio Generation (Google Cloud TTS)
When you click "Generate Audio" for the full story, it uses **Google Cloud Text-to-Speech** with mapped Neural2 voices:

### Current Voice Mapping:

| Frontend Voice | Description | Google Cloud Voice | Type |
|----------------|-------------|-------------------|------|
| **Charon** | Deep Narrator | en-US-Neural2-D | Male (Deep) |
| **Kore** | Eloquent Orator | en-US-Neural2-A | Male (Clear) |
| **Puck** | Authoritative Voice | en-US-Neural2-J | Male (Strong) |
| **Fenrir** | Gravelly Storyteller | en-US-Neural2-I | Male (Mature) |
| **Aoede** | Smooth Narrator | en-US-Neural2-C | Female (Smooth) |
| **Callirrhoe** | Gentle Storyteller | en-US-Neural2-F | Female (Warm) |
| **Orus** | Bold Narrator | en-US-Neural2-D | Male (Bold) |
| **Zephyr** | Calm Chronicler | en-US-Neural2-H | Female (Calm) |
| **Enceladus** | Rich Narrator | en-US-Neural2-J | Male (Rich) |
| **Leda** | Clear Voice | en-US-Neural2-E | Female (Clear) |

## Why Two Systems?

1. **Preview**: Uses Gemini's built-in TTS for quick voice samples
2. **Full Audio**: Uses Google Cloud TTS `synthesizeLongAudio` for production-quality, unlimited-length audio

## Testing Voices

To verify the voice mapping is working:

1. **Check Backend Logs**: When generating audio, you should see:
   ```
   [Long Audio TTS] Voice mapping - Input: Charon, Output: en-US-Neural2-D
   ```

2. **Test Different Voices**: Try generating audio with different voices and check:
   - The backend log shows the correct mapping
   - The audio sounds different between voices
   - Male voices sound distinctly different from female voices

## Available Google Cloud Neural2 Voices

The Neural2 voices used are high-quality, natural-sounding voices:

- **Neural2-A**: Male, clear and professional
- **Neural2-C**: Female, smooth and pleasant
- **Neural2-D**: Male, deep and authoritative
- **Neural2-E**: Female, clear and precise
- **Neural2-F**: Female, warm and friendly
- **Neural2-H**: Female, calm and soothing
- **Neural2-I**: Male, mature and experienced
- **Neural2-J**: Male, strong and commanding

## Troubleshooting

If voices sound the same or use the default voice:

1. **Check backend logs** for the voice mapping message
2. **Verify voiceName is being sent** from frontend
3. **Ensure backend was restarted** after updating voice mapping
4. **Test with distinctly different voices** (e.g., Charon vs Aoede - male vs female)

## Future Improvements

Potential enhancements:
- Allow custom voice selection with all available Neural2 voices
- Add voice parameters (speed, pitch)
- Support for multilingual voices
- Direct voice preview from Google Cloud TTS instead of Gemini
