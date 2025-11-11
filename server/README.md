# YouTube Stories Backend

Secure backend API proxy for the YouTube Stories application.

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `server/.env` and add your API keys:
   - `GEMINI_API_KEY`: Get from [Google AI Studio](https://aistudio.google.com/apikey)
   - `YOUTUBE_API_KEY`: Get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

3. **Start the server:**
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:3001`

## API Endpoints

### POST `/api/gemini/generate`
Proxy for Gemini content generation.

**Request body:**
```json
{
  "model": "gemini-2.5-pro",
  "contents": "...",
  "config": {}
}
```

### POST `/api/gemini/generate-image`
Proxy for Imagen image generation.

**Request body:**
```json
{
  "model": "imagen-4.0-generate-001",
  "prompt": "...",
  "config": {}
}
```

## Security

- API keys are stored securely in `.env` file (not committed to git)
- CORS is configured to only allow requests from the frontend
- All requests are proxied through the backend to hide API keys

## Production Deployment

For production, deploy this backend to:
- **Heroku**
- **Railway**
- **Render**
- **Vercel/Netlify** (as serverless functions)

Update the `VITE_API_URL` in your frontend `.env` to point to your deployed backend.
