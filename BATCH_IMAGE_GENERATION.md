# Batch Image Generation Feature

## Overview
This feature allows you to generate multiple cinematic images (up to 200) from your story script for use in YouTube videos or thumbnails.

## How It Works

### 1. Story Analysis
- The system uses Gemini AI to analyze your complete story
- It automatically splits the story into distinct visual scenes
- For each scene, it generates a detailed image prompt

### 2. Image Generation
- Uses Google's Imagen 4.0 API to generate high-quality images
- Each image is in 16:9 aspect ratio (perfect for YouTube)
- All images follow a cinematic YouTube thumbnail style with:
  - Vibrant, saturated colors
  - Dramatic lighting
  - Emotional close-ups
  - Mystery and intrigue

### 3. Download & Organization
- All images are packaged into a single ZIP file
- Each image is named: `scene_001.png`, `scene_002.png`, etc.
- Includes metadata files with scene descriptions and prompts
- Easy to extract and use in your video editing software

## Usage Instructions

### Step 1: Complete Your Story
1. Generate your story using the app
2. Complete the voice generation if desired
3. The batch image generator will appear below the audio generation section

### Step 2: Choose Number of Images
You can select from preset options:
- **10 images** - Quick overview (~25 seconds)
- **25 images** - Medium coverage (~1 minute)
- **50 images** - Detailed coverage (~2 minutes)
- **100 images** - Comprehensive coverage (~4 minutes)
- **Custom** - Enter any number between 1-200

### Step 3: Generate
1. Click "Generate X Images"
2. Wait for the process to complete (estimated time is shown)
3. Progress bar shows real-time status

### Step 4: Preview & Download
1. Click "Show Preview" to view all generated images
2. Review scene descriptions for each image
3. Click "Download All as ZIP" to save everything
4. Extract the ZIP file to access your images

## Technical Details

### Backend Endpoint
- **Endpoint**: `/api/gemini/batch-generate-images`
- **Method**: POST
- **Rate Limiting**: 1.5 seconds between each image generation
- **Retry Logic**: 3 attempts per image with exponential backoff

### Image Specifications
- **Format**: PNG
- **Aspect Ratio**: 16:9
- **Model**: Imagen 4.0 Generate 001
- **Style**: Cinematic YouTube thumbnail aesthetic

### Processing Time
Approximate generation times:
- 10 images: ~25 seconds
- 25 images: ~1 minute
- 50 images: ~2 minutes
- 100 images: ~4 minutes
- 200 images: ~8 minutes

## Tips for Best Results

1. **Complete Story**: Ensure your story is fully written before generating images
2. **Length**: Longer stories (5000+ words) work better for large image batches
3. **Scene Variety**: Stories with diverse scenes produce more interesting visuals
4. **Emotional Moments**: The AI prioritizes dramatic and emotional beats

## File Structure

When you download the ZIP file, you'll get:

```
your_story_title_100_scenes_2026-02-08.zip
├── scene_001.png
├── scene_001_info.txt
├── scene_002.png
├── scene_002_info.txt
├── ...
└── scene_100_info.txt
```

Each `_info.txt` file contains:
- Scene number
- Scene description (what happens in this part)
- Image generation prompt (visual details used)

## Use Cases

1. **YouTube Videos**: Use as b-roll or visual storytelling elements
2. **Thumbnails**: Pick the most compelling image for your video thumbnail
3. **Social Media**: Share scenes on Instagram, TikTok, or other platforms
4. **Storyboarding**: Use as a visual storyboard for planning
5. **Marketing**: Create promotional materials for your content

## Limitations

- Maximum 200 images per batch
- Requires completed story
- Processing time increases with number of images
- Each image is generated independently (no animation/continuity)

## Troubleshooting

**Generation Failed?**
- Check your internet connection
- Try reducing the number of images
- Ensure your story has sufficient content

**ZIP Download Not Working?**
- Check browser download settings
- Ensure you have enough disk space
- Try a different browser

**Images Don't Match Story?**
- Review the scene descriptions in preview
- Try regenerating with a different count
- Longer stories provide better context

## Future Enhancements

Potential improvements being considered:
- Custom style prompts per scene
- Character consistency across images
- Manual scene selection
- Video slideshow export
- Direct YouTube upload integration
