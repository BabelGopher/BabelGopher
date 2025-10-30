# BabelGopher 🌐

> Real-time multilingual interpretation for audio conversations using 100% on-device AI

**Chrome Built-in AI Challenge 2025**

## Overview

BabelGopher breaks down language barriers in real-time video conferencing by combining:
- **LiveKit WebRTC** for peer-to-peer audio communication
- **Web Speech API** for speech-to-text transcription
- **Chrome Translation API** for on-device translation
- **Web Speech Synthesis** for natural voice output

All AI processing happens **on-device** in your browser - no cloud APIs, no external servers for AI.

## ✨ Key Features

- 🎤 **Real-time Speech-to-Text** - Continuous transcription using Web Speech API
- 🌍 **Instant Translation** - 10+ languages with Chrome's built-in AI
- 🔊 **Natural Voice Output** - Text-to-speech in your preferred language
- 💬 **Live Subtitles** - Side-by-side original + translated text
- 🎛️ **User Controls** - Language selection, TTS toggle, subtitle toggle
- 👥 **Multi-Participant** - Support for multiple participants via LiveKit
- 🔒 **Privacy-First** - All AI processing on-device, no cloud uploads
- ⚡ **Low Latency** - Typical pipeline: <500ms from speech to translated audio

## 🛠️ Tech Stack

### Core Technologies
- **LiveKit** - WebRTC for real-time audio communication
- **Web Speech API** - Browser-native speech recognition (STT)
- **Chrome Translation API** - On-device translation (with Prompt API fallback)
- **Web Speech Synthesis** - Browser-native text-to-speech (TTS)

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **LiveKit Client SDK** - WebRTC client

### Backend (Minimal)
- **Next.js API Routes** - JWT token generation for LiveKit
- **livekit-server-sdk** - Server-side token signing

### State Management
- **React Context API** - Global state
- **Custom hooks** - Modular logic (useSTT, useTranslation, useTTS, etc.)

## 🚀 Getting Started

### Prerequisites

- **Chrome Canary** or **Edge Dev** (required for Chrome Built-in AI)
- **Node.js 18+** and **pnpm 9.x**
- **LiveKit Account** - Get free tier at [cloud.livekit.io](https://cloud.livekit.io/)

### 1. Chrome AI Setup

BabelGopher requires Chrome Canary with experimental AI features enabled.

**Quick Setup:**
1. Install [Chrome Canary](https://www.google.com/chrome/canary/)
2. Open `chrome://flags`
3. Enable these flags:
   - `#translation-api` → **Enabled**
   - `#prompt-api-for-gemini-nano` → **Enabled**
   - `#optimization-guide-on-device-model` → **Enabled BypassPerfRequirement**
4. Restart browser
5. Verify: Open DevTools console, type `'ai' in window && 'translation' in window` → should return `true`

**Detailed setup guide:** See [docs/CHROME_AI_SETUP.md](docs/CHROME_AI_SETUP.md)

### 2. Install Dependencies

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install dependencies (from project root)
pnpm install
```

### 3. Configure Environment Variables

```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local` with your LiveKit credentials:

```bash
# Get these from https://cloud.livekit.io/
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 4. Start Development Server

```bash
cd apps/web
pnpm dev
```

### 5. Open in Browser

1. Open http://localhost:3000 in **Chrome Canary**
2. Enter your name and a room code
3. Select your preferred output language
4. Click "Join Conference"
5. Grant microphone permission when prompted
6. Start speaking - watch real-time transcription and translation!

### 6. Test with Multiple Participants

Open a second tab or window and join the same room with a different name.

**Note**: Only your own speech is transcribed (Web Speech API limitation). See [Limitations](#-limitations) below.

## 📖 How It Works

### Pipeline Architecture

```
Your Microphone
      │
      ▼
┌─────────────┐
│  LiveKit    │  Publishes audio to room
│  (WebRTC)   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Speech Recognition│  Continuous transcription
│  (Web Speech API) │
└────────┬──────────┘
         │
         ▼ "Hello world"
┌──────────────────┐
│   Translation    │  Chrome Translation API
│  (Chrome AI)     │
└────────┬─────────┘
         │
         ▼ "안녕하세요"
┌──────────────────┐
│   Subtitles +    │  Display + speak
│   TTS Output     │
└──────────────────┘
```

### Component Flow

1. **LiveKit Connection** (`useLiveKit.ts`)
   - Connects to LiveKit room with JWT token
   - Publishes local audio track
   - Receives remote participants' audio

2. **Speech-to-Text** (`useSTT.ts`)
   - Captures microphone input via Web Speech API
   - Continuous recognition with auto-restart
   - Emits final transcription results

3. **Translation** (`useTranslation.ts`)
   - Receives transcription from STT
   - Translates to user's target language
   - Uses Chrome Translation API (or Prompt API fallback)

4. **Text-to-Speech** (`useTTS.ts`)
   - Speaks translated text
   - Uses Web Speech Synthesis
   - Auto-selects voice for target language

5. **Orchestration** (`useConferenceOrchestrator.ts`)
   - Coordinates entire pipeline
   - Manages state synchronization
   - Handles errors and capability checking

### State Management

- **Context API** for global state
- **Custom hooks** for each feature
- **React Reducer pattern** for complex state updates
- **localStorage** for persisted preferences

## 📚 Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - Technical architecture and design
- **[Chrome AI Setup](docs/CHROME_AI_SETUP.md)** - Detailed Chrome setup guide
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## ⚠️ Limitations

### Current Limitations

1. **Local Participant Only**
   - Only your own speech is transcribed
   - Web Speech API limitation (requires getUserMedia microphone)
   - **Workaround**: Each participant transcribes their own speech (future: sync via LiveKit data channel)

2. **Browser Requirements**
   - Requires Chrome Canary or Edge Dev
   - Chrome Built-in AI features are experimental
   - Not available in Firefox or Safari

3. **Language Detection**
   - STT language currently hardcoded to English
   - **Planned**: Auto-detect speaking language

4. **Performance**
   - CPU-intensive on-device processing
   - Recommended: 8GB+ RAM
   - Best with 2-4 participants

5. **Translation Quality**
   - Depends on Chrome's on-device models
   - Some language pairs may be less accurate
   - Long sentences may fail

### Planned Enhancements

- **LiveKit Data Channel** - Sync transcriptions between participants
- **Language Auto-Detection** - Detect speaking language automatically
- **Server-Side STT** - Optional cloud transcription for remote participants
- **Video Support** - Currently audio-only
- **Mobile App** - React Native implementation
- **Export History** - Save conversation transcripts

## 🧪 Testing

```bash
# Type check
cd apps/web
pnpm tsc

# Build check
pnpm build

### Deployment Strategy

**Backend (Go Server):**
- Platform: Google Cloud Run
- Build: Multi-stage Docker image (golang:1.24-alpine → distroless)
- Deployment: Automated via GitHub Actions (configured in Story 1.3)
- Health Check: `/health` endpoint returns `{"status":"healthy"}`

**Frontend (Next.js):**
- Platform: Vercel
- Build: Next.js static export or SSR
- Deployment: Automated via Vercel GitHub integration

**CI/CD Pipelines:**
- Backend tests run automatically on push to `main`/`develop`
- Frontend builds validate on pull requests
- Deployment workflows available in `.github/workflows/`

## API Documentation

### Authentication Endpoint

**POST /auth-livekit-token**

Generate a LiveKit access token for joining a room.

**Request Body:**
```json
{
  "user_identity": "unique-user-id",
  "room_name": "room-name"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Token generation failed

**Example:**
```bash
curl -X POST http://localhost:8080/auth-livekit-token \
  -H "Content-Type: application/json" \
  -d '{"user_identity": "user123", "room_name": "my-room"}'
```

**CORS:** Configured to allow all origins for development

### Health Check Endpoint

**GET /health**

Check server health status.

**Success Response (200 OK):**
```json
{
  "status": "healthy"
}
```

### Environment Variables

Required for backend operation:

| Variable | Description | Example |
|----------|-------------|---------|
| `LIVEKIT_API_KEY` | LiveKit Cloud API key | `APIxxxxxxx` |
| `LIVEKIT_API_SECRET` | LiveKit Cloud API secret | `xxxxxxxxxxxxx` |
| `LIVEKIT_URL` | LiveKit WebSocket URL | `wss://project.livekit.cloud` |
| `PORT` | Server port (optional) | `8080` |

Get your LiveKit credentials from: https://cloud.livekit.io/

## Features Implemented

**Phase 1 - Basic Setup & LiveKit Connection:**
- Monorepo structure with pnpm workspaces
- Go authentication server with LiveKit token generation
- Next.js frontend with Tailwind CSS
- LiveKit room connection (audio-only)
- Multi-participant support
- Real-time participant list

**Phase 2 - Real-Time Transcription:**
- Chrome Built-in AI Speech-to-Text integration
- Real-time audio chunking and transcription
- Multi-participant transcription support
- Live transcription display with timestamps
- Chrome AI availability detection and setup instructions
- Comprehensive PoC test suite for validation

**Phase 2 - Real-Time Translation:**
- Chrome AI Translation integration (Translator API + Prompt API fallback)
- Automatic translation of transcriptions
- Support for 10 languages (English, Korean, Japanese, Chinese, Spanish, French, German, Italian, Portuguese, Russian)
- Language selection with persistent preferences
- Debounced translation for performance optimization
- Original and translated text display side-by-side
- Translation latency tracking and optimization

**Phase 2 - Text-to-Speech (TTS):**
- Web Speech API integration for translated audio output
- 5-tier voice selection system (cloud → Google → exact → base → fallback)
- Multi-layered echo cancellation to prevent feedback
- Cancel-and-replace queuing for smooth audio playback
- User-adjustable TTS settings (volume, speed, pitch)
- Settings persistence via localStorage
- TTS enable/disable toggle for user control

**Phase 3 - Translation Controls & Subtitle UI:**
- Language selector in lobby page (10 languages)
- Language parameter passed via URL to conference view
- Toggleable subtitle panel with real-time display
- Side-by-side original and translated text display
- Speaker identification with color coding (5 colors)
- Speaking indicator ('...') appears before transcription
- Auto-scroll with manual scroll pause/resume
- WCAG AA compliant (4.5:1 contrast, keyboard accessible, ARIA labels)
- Responsive design (desktop sidebar, mobile bottom overlay)
- TTS and subtitle independent toggles

**Phase 3+ - Coming Soon:**
- Video track support (currently audio-only)
- Mobile app (React Native)
- Conversation history export
- Custom vocabulary support

## Testing

**Backend Tests:**
```bash
cd apps/server
go test -v ./...
```

**Frontend Manual Testing:**
1. Start both backend and frontend servers (see Development section)
2. Open http://localhost:3000
3. Enter name: "Alice", room: "test-room"
4. Click "Join Room"
5. Open second browser tab
6. Enter name: "Bob", room: "test-room"
7. Verify both participants see each other in the participant list

**Testing Checklist:**
- Health endpoint: `curl http://localhost:8080/health`
- Token endpoint: `curl -X POST http://localhost:8080/auth-livekit-token -H "Content-Type: application/json" -d '{"user_identity":"test","room_name":"test"}'`
- Frontend lobby form validation
- LiveKit connection success/failure handling
- Multi-participant room join/leave

**STT Testing (Chrome Canary Required):**
1. Follow Chrome AI Setup instructions above
2. Join a room with 2+ participants
3. Verify "Chrome AI Available" status shows in room
4. Speak into your microphone
5. Verify real-time transcriptions appear in the transcription panel
6. Test with multiple participants speaking
7. Verify participant names and timestamps display correctly
8. Test "Clear Transcriptions" button

**Translation Testing (Chrome Canary Required):**
1. Follow Chrome AI Setup instructions above
2. Join a room and start speaking (or have another participant speak)
3. Verify "Translation Available" status shows in room
4. Select target language from dropdown (e.g., Korean, Japanese, Spanish)
5. Observe automatic translation of transcriptions (with 300ms debounce)
6. Verify both original and translated text display correctly
7. Test with multiple language pairs (English→Korean, Korean→English, etc.)
8. Verify translation latency is acceptable (<500ms)
9. Test "Clear All" button to clear both transcriptions and translations
10. Verify language preference persists after page reload

**PoC Test Suite:**
- See `apps/web/src/poc/README.md` for detailed PoC testing instructions
- Run automated test suite to validate Chrome AI integration
- Generate test reports for debugging

## Project Structure

```
babelgopher/
├── apps/
│   ├── web/      # Next.js frontend
│   └── server/   # Go backend
├── docs/         # Documentation
└── packages/     # Shared packages
```

## License

MIT License - see [LICENSE](./LICENSE)

## Hackathon Submission

Phase 1 MVP for Chrome Built-in AI Challenge 2025
