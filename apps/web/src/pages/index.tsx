import { useState } from 'react';
import { useRouter } from 'next/router';
import { useLiveKit } from '@/hooks/useLiveKit';
import { fetchLiveKitToken } from '@/lib/api';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function LobbyPage() {
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { connect } = useLiveKit();
  const router = useRouter();

  const handleJoin = async () => {
    // Validate inputs
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get LiveKit token from backend
      const token = await fetchLiveKitToken(name.trim(), roomName.trim());

      // Get LiveKit URL from environment
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!livekitUrl) {
        throw new Error('NEXT_PUBLIC_LIVEKIT_URL environment variable is not configured');
      }

      // Connect to LiveKit room
      await connect(token, livekitUrl);

      // Navigate to room page with language parameter
      router.push(`/room/${encodeURIComponent(roomName.trim())}?lang=${targetLanguage}`);
    } catch (err) {
      console.error('Failed to join room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleJoin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BabelGopher</h1>
          <p className="text-gray-600">Real-time multilingual translation</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label="Your name"
            />
          </div>

          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
              Room Name
            </label>
            <input
              id="roomName"
              type="text"
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label="Room name"
            />
          </div>

          {/* Language Selector */}
          <LanguageSelector
            selectedLanguage={targetLanguage}
            onChange={setTargetLanguage}
          />

          <button
            onClick={handleJoin}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-label="Join room"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Connecting...
              </span>
            ) : (
              'Join Room'
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Chrome Built-in AI Challenge 2025
          </p>
        </div>
      </div>
    </div>
  );
}
