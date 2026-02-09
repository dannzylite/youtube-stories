# Quick Start: Batch Image Generation

## 🚀 Getting Started

### Prerequisites
Make sure your server is running:
```bash
cd server
npm start
```

And your frontend is running:
```bash
npm run dev
```

## 📸 How to Generate Images

### Step 1: Create Your Story
1. Open the app in your browser
2. Enter your story or use competitor analysis mode
3. Generate your complete story (both parts)

### Step 2: Access Batch Generator
1. After your story is complete, scroll down
2. You'll see the "Batch Image Generation" section below audio generation
3. The feature only appears when your story is marked as complete

### Step 3: Choose Your Settings
**Quick presets:**
- 10 images - Great for testing
- 25 images - Good for short stories
- 50 images - Standard coverage
- 100 images - Full coverage

**Or enter custom number (1-200)**

### Step 4: Generate & Download
1. Click "Generate X Images" button
2. Wait for completion (progress bar shows status)
3. Click "Show Preview" to see all images
4. Click "Download All as ZIP" to save

## 💡 Pro Tips

### For Best Results
✅ Use complete, detailed stories (5000+ words recommended)
✅ Include emotional moments and dramatic scenes
✅ Ensure story has clear narrative structure

### Performance Tips
- Start with 10 images to test
- Increase to 25-50 for typical use
- Use 100+ only for comprehensive projects
- Don't close the browser during generation

### What You Get
Each ZIP file contains:
- PNG images (16:9 ratio)
- Scene description text files
- Sequential numbering (scene_001, scene_002, etc.)

## 🎬 Using Generated Images

### For YouTube Videos
1. Extract the ZIP file
2. Import images into your video editor
3. Use as b-roll or background visuals
4. Sync with your voice-over

### For Thumbnails
1. Preview all generated images
2. Pick the most eye-catching scene
3. Optionally add text overlay
4. Upload to YouTube

### For Social Media
- Instagram Stories: Use vertical crop
- TikTok: Extract key scenes
- Facebook: Use as post images
- Twitter: Share story highlights

## ⚙️ Technical Requirements

### System Requirements
- Modern browser (Chrome, Firefox, Edge, Safari)
- Stable internet connection
- Sufficient disk space (~50MB per 100 images)

### API Requirements
- Backend server running on port 3001
- Valid Gemini API key configured
- Imagen API access enabled

## 🔧 Troubleshooting

### "Generation Failed" Error
**Solution:**
- Check backend server is running
- Verify API keys in server/.env
- Check console for detailed errors

### Slow Generation
**Normal behavior:**
- Each image takes ~2-3 seconds
- 100 images = ~4-5 minutes total
- Progress bar shows real-time status

### ZIP Download Issues
**Try:**
- Different browser
- Clear browser cache
- Check popup blockers
- Ensure disk space available

### Images Don't Match Story
**This can happen if:**
- Story is too short (< 2000 words)
- Too many images requested for story length
- Story lacks scene variety

**Solution:** Try fewer images or longer story

## 📊 Example Workflow

### Complete Tutorial (Step by Step)

1. **Start the Application**
   ```bash
   # Terminal 1: Start backend
   cd server
   npm start

   # Terminal 2: Start frontend
   npm run dev
   ```

2. **Create Story**
   - Paste your script (or competitor transcript)
   - Generate title and background
   - Generate complete story (2 parts)

3. **Optional: Generate Voice**
   - Choose your preferred voice
   - Generate audio file
   - Download WAV file

4. **Generate Images**
   - Select number (e.g., 25)
   - Click "Generate 25 Images"
   - Wait ~1 minute
   - Preview results

5. **Download & Use**
   - Click "Download All as ZIP"
   - Extract to your project folder
   - Import into video editor
   - Create your video!

## 🎯 Next Steps

After generating images:
1. ✅ Download the ZIP file
2. ✅ Extract to your projects folder
3. ✅ Import into video editor (DaVinci Resolve, Premiere, etc.)
4. ✅ Sync with your generated voice-over
5. ✅ Add music and effects
6. ✅ Export and upload to YouTube!

## 📝 Notes

- Generated images are unique each time
- Scene selection is automatic (AI-powered)
- All images follow cinematic style
- No text/titles in images (add in post)
- Commercial use allowed (check API terms)

---

**Need help?** Check [BATCH_IMAGE_GENERATION.md](BATCH_IMAGE_GENERATION.md) for detailed documentation.
