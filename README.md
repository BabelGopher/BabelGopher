# BabelGopher 🌐

> Real-time multilingual translation for audio conversations using 100% client-side AI

**Chrome Built-in AI Challenge 2025**

## Overview

BabelGopher breaks down language barriers in video conferencing and live streaming by leveraging Chrome Built-in AI APIs to perform real-time speech-to-text, translation, and text-to-speech entirely in the browser.

## Key Features

- 🎤 Real-time Speech-to-Text (Chrome Prompt API)
- 🌍 Multilingual Translation (Chrome Translator API)
- 🔊 Natural Voice Output (Web Speech API)
- 💬 Live Subtitles (Original + Translated)
- 🎛️ User Controls (Language selection, toggles)
- 👥 Multi-Participant Support

## Tech Stack

### Frontend
- Next.js 14 (React + TypeScript)
- Tailwind CSS
- LiveKit Client SDK

### Backend
- Go 1.22
- LiveKit Server SDK
- Google Cloud Run

## Getting Started

### Prerequisites

- **Chrome Canary with Built-in AI flags enabled** (required for STT features)
- pnpm 9.x
- Go 1.22+
- Docker (for deployment)

### Chrome AI Setup

To use BabelGopher's AI-powered real-time transcription, you need Chrome Canary with built-in AI enabled:

1. **Install Chrome Canary**: https://www.google.com/chrome/canary/

2. **Enable AI features**:
   - Navigate to: `chrome://flags/#optimization-guide-on-device-model`
   - Set to: **"Enabled BypassPerfRequirement"**

   - Navigate to: `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to: **"Enabled"**

3. **Restart Chrome Canary**

4. **Verify installation**:
   - Open DevTools Console
   - Type: `window.ai?.languageModel`
   - Should return an object (not undefined)

5. **First run**: Model download may occur automatically (check `chrome://components/`)

For detailed information: https://developer.chrome.com/docs/ai/built-in

### Development

**1. Configure Environment Variables:**

Backend:
```bash
cd apps/server
cp .env.example .env
# Edit .env with your LiveKit credentials from https://cloud.livekit.io/
```

Frontend:
```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with:
# - NEXT_PUBLIC_SERVER_URL (your backend URL, e.g., http://localhost:8080)
# - NEXT_PUBLIC_LIVEKIT_URL (your LiveKit WebSocket URL from dashboard)
```

**2. Start Services:**

Terminal 1 - Backend:
```bash
cd apps/server
source .env  # Load environment variables
go run main.go
```

Terminal 2 - Frontend:
```bash
cd apps/web
pnpm dev
```

**3. Access the Application:**
- Open http://localhost:3000 in your browser
- Enter your name and a room name
- Click "Join Room" to connect
- Open a second browser tab/window to test with multiple participants

### Testing

```bash
# Run Go tests
cd apps/server && go test ./...

# Run frontend tests
cd apps/web && pnpm test
```

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
