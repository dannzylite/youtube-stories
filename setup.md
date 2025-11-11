# Setup Instructions

## Backend Setup

1. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure API keys:**
   ```bash
   cp .env.example .env
   ```

   Your API keys are already in `server/.env`, but verify them:
   - `GEMINI_API_KEY`: ✅ Already configured
   - `YOUTUBE_API_KEY`: ✅ Already configured

3. **Start the backend server:**
   ```bash
   npm run dev
   ```

   Backend will run on `http://localhost:3001`

## Frontend Setup

1. **Return to root directory:**
   ```bash
   cd ..
   ```

2. **The `.env` file is already created** with:
   ```
   VITE_API_URL=http://localhost:3001
   ```

3. **Update your App to use the proxy service** (optional for now):

   You can keep using the current geminiService, or switch to the proxy by:
   - Importing from `geminiServiceProxy` instead of `geminiService`

4. **Remove API keys from index.html:**
   - The GEMINI_API_KEY can be removed from index.html
   - Keep YOUTUBE_API_KEY in index.html for now (OAuth needs it client-side)

## Running Both Services

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## What Changed

### ✅ Security Improvements:
- API keys moved to `.env` files (gitignored)
- Backend proxy protects Gemini API key
- CORS configured for security

### 📁 New Files:
- `server/` - Backend Express server
- `services/geminiServiceProxy.ts` - Frontend proxy client
- `.env` files for configuration

### 🔒 Protected:
- `.env` files are in `.gitignore`
- API keys no longer visible in frontend code
- Backend validates and proxies all Gemini requests

## Next Steps

1. **Test the backend** by visiting http://localhost:3001/health
2. **Keep YouTube OAuth client-side** (it needs user interaction)
3. **For production**: Deploy backend to Heroku/Railway/Render
