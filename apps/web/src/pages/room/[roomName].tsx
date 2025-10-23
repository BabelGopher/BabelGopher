import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useSTT, TranscriptionSegment } from '@/hooks/useSTT';
import { useTranslation, useTargetLanguage } from '@/hooks/useTranslation';
import { useTTS, useTTSSettings, TTSMessage } from '@/hooks/useTTS';
import { RoomEvent, RemoteAudioTrack, Track, RemoteParticipant } from 'livekit-client';
import { getChromeAISetupInstructions } from '@/lib/chromeAI';
import { getTranslationSetupInstructions } from '@/lib/translation';
import { getTTSSetupInstructions } from '@/lib/tts';
import { SubtitlePanel } from '@/components/SubtitlePanel';
import {
  SUPPORTED_LANGUAGES as ALL_SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
  isValidLanguageCode,
} from '@/components/LanguageSelector';

// Workaround: Convert array to object for backward compatibility
const SUPPORTED_LANGUAGES = Object.fromEntries(
  ALL_SUPPORTED_LANGUAGES.map(lang => [lang.code, lang.name])
);

export default function RoomPage() {
  const router = useRouter();
  const { roomName, lang } = router.query;
  const { room, isConnected, isConnecting, connectionError, disconnect } = useLiveKit();

  // STT state
  const {
    transcriptions,
    isTranscribing,
    transcriptionError,
    isChromeAIAvailable,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
  } = useSTT();

  // Translation state
  const {
    translations,
    isTranslating,
    translationError,
    isTranslationAvailable,
    translateText,
    clearTranslations,
  } = useTranslation();

  const { targetLanguage, setTargetLanguage } = useTargetLanguage('en');

  // Sync target language from URL parameter
  useEffect(() => {
    // ✅ FIX #3: Validate language code from URL param
    if (
      lang &&
      typeof lang === 'string' &&
      isValidLanguageCode(lang) &&
      lang !== targetLanguage
    ) {
      setTargetLanguage(lang);
    }
  }, [lang, targetLanguage, setTargetLanguage]);

  // TTS state
  const { ttsSettings, updateTTSSettings } = useTTSSettings();
  const [currentTTSMessage, setCurrentTTSMessage] = useState<TTSMessage | null>(null);
  const [ttsEnabled, setTTSEnabled] = useState(true); // TTS on by default
  const { isSpeaking, ttsError, isTTSAvailable } = useTTS(
    ttsEnabled ? currentTTSMessage : null,
    ttsSettings
  );

  // UI state
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [showTranslationInstructions, setShowTranslationInstructions] = useState(false);
  const [showTTSInstructions, setShowTTSInstructions] = useState(false);
  const [activeTranscriptions, setActiveTranscriptions] = useState<Set<string>>(new Set());
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true); // Subtitles on by default
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());

  // ✅ FIX #1: Use a ref to store stable handlers for speaking events
  const speakingHandlersRef = useRef<Map<string, (speaking: boolean) => void>>(new Map());

  // Connection guard: Redirect to lobby if no active connection
  useEffect(() => {
    // Only redirect if definitively not connected (not just loading)
    if (!isConnecting && !isConnected) {
      console.log('No active connection, redirecting to lobby...');
      router.push('/');
    }
  }, [isConnecting, isConnected, router]);

  // Handle remote participant audio tracks for transcription
  useEffect(() => {
    if (!room || !isConnected || !isChromeAIAvailable) return;

    // ✅ FIX #1: Stable function to get/create speaking change handlers
    const getSpeakingHandler = (participant: RemoteParticipant) => {
      if (!speakingHandlersRef.current.has(participant.sid)) {
        const handler = (speaking: boolean) => {
          setSpeakingParticipants((prev) => {
            const next = new Set(prev);
            if (speaking) {
              next.add(participant.sid);
            } else {
              next.delete(participant.sid);
            }
            return next;
          });
        };
        speakingHandlersRef.current.set(participant.sid, handler);
      }
      return speakingHandlersRef.current.get(participant.sid)!;
    };

    const handleTrackSubscribed = async (
      track: Track,
      publication: any,
      participant: RemoteParticipant
    ) => {
      // Only handle audio tracks
      if (track.kind !== Track.Kind.Audio) return;
      if (!(track instanceof RemoteAudioTrack)) return;

      console.log(`[STT] Audio track subscribed from: ${participant.identity}`);

      try {
        await startTranscription(
          track,
          participant.sid,
          participant.identity
        );

        setActiveTranscriptions((prev) => new Set(prev).add(participant.sid));
      } catch (error) {
        console.error('[STT] Failed to start transcription:', error);
      }
    };

    const handleTrackUnsubscribed = (
      track: Track,
      publication: any,
      participant: RemoteParticipant
    ) => {
      if (track.kind !== Track.Kind.Audio) return;

      console.log(`[STT] Audio track unsubscribed from: ${participant.identity}`);
      stopTranscription(participant.sid);

      setActiveTranscriptions((prev) => {
        const next = new Set(prev);
        next.delete(participant.sid);
        return next;
      });
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log(`[STT] Participant disconnected: ${participant.identity}`);
      stopTranscription(participant.sid);

      setActiveTranscriptions((prev) => {
        const next = new Set(prev);
        next.delete(participant.sid);
        return next;
      });

      // ✅ FIX #1: Clean up handler from ref map on disconnect
      if (speakingHandlersRef.current.has(participant.sid)) {
        participant.off('isSpeakingChanged', getSpeakingHandler(participant));
        speakingHandlersRef.current.delete(participant.sid);
      }
    };

    // Listen for track subscriptions
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    // Register speaking listeners for all remote participants
    room.remoteParticipants.forEach((participant) => {
      // ✅ FIX #1: Use the stable handler
      participant.on('isSpeakingChanged', getSpeakingHandler(participant));

      // Start transcription for already-subscribed audio tracks
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.audioTrack) {
          handleTrackSubscribed(
            publication.audioTrack,
            publication,
            participant
          );
        }
      });
    });

    // Cleanup
    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

      // ✅ FIX #1: Clean up using the same stable handler reference
      room.remoteParticipants.forEach((participant) => {
        participant.off('isSpeakingChanged', getSpeakingHandler(participant));
      });
      // ✅ FIX #1: Clear the entire map on cleanup for safety
      speakingHandlersRef.current.clear();
    };
  }, [room, isConnected, isChromeAIAvailable, startTranscription, stopTranscription]);

  // Auto-translate new transcriptions with debouncing
  useEffect(() => {
    if (!isTranslationAvailable || transcriptions.length === 0) return;

    // Get the latest transcription
    const latestTranscription = transcriptions[transcriptions.length - 1];

    // Debounce: wait 300ms before translating to avoid translating partial sentences
    const timeoutId = setTimeout(() => {
      if (latestTranscription.text && latestTranscription.text.trim().length > 0) {
        translateText(latestTranscription.text, {
          sourceLang: 'auto', // Auto-detect source language
          targetLang: targetLanguage,
          participantId: latestTranscription.participantId,
          participantName: latestTranscription.participantName,
        }).catch((error) => {
          console.error('[Room] Translation failed:', error);
        });
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [transcriptions, targetLanguage, isTranslationAvailable, translateText]);

  // Auto-speak new translations with TTS
  useEffect(() => {
    if (!isTTSAvailable || !ttsEnabled || translations.length === 0) return;

    // Get the latest translation
    const latestTranslation = translations[translations.length - 1];

    // Create TTS message with unique ID based on timestamp
    if (latestTranslation.translatedText && latestTranslation.translatedText.trim().length > 0) {
      setCurrentTTSMessage({
        text: latestTranslation.translatedText,
        lang: latestTranslation.targetLang,
        id: `${latestTranslation.timestamp}-${latestTranslation.participantId}`,
      });
    }
  }, [translations, isTTSAvailable, ttsEnabled]);

  const handleLeave = () => {
    disconnect();
    router.push('/');
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Connection Failed</h2>
          <p className="text-gray-700 mb-6">{connectionError}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Connecting to room...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Prevent rendering if not connected or room is null (guard against direct URL access)
  if (!isConnected || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Not connected to room. Redirecting to lobby...</p>
        </div>
      </div>
    );
  }

  // Get participant count (remote participants + self)
  const participantCount = room.remoteParticipants.size + 1;
  const participants = Array.from(room.remoteParticipants.values());

  // ✅ FIX #2: Create a map of all participants to pass to SubtitlePanel
  const participantData = new Map<string, { identity: string }>();
  room.remoteParticipants.forEach((p) => {
    participantData.set(p.sid, { identity: p.identity });
  });
  participantData.set(room.localParticipant.sid, {
    identity: room.localParticipant.identity,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Connected to Room: {roomName}
              </h1>
              <p className="text-gray-600">
                {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
              </p>
            </div>
            <button
              onClick={handleLeave}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Participants List */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants</h2>
          <div className="space-y-3">
            {/* Local Participant (You) */}
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold mr-3">
                {room.localParticipant.identity.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {room.localParticipant.identity} <span className="text-sm text-blue-600">(You)</span>
                </p>
                <p className="text-sm text-gray-500">Local Participant</p>
              </div>
            </div>

            {/* Remote Participants */}
            {participants.map((participant) => (
              <div key={participant.sid} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold mr-3">
                  {participant.identity.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{participant.identity}</p>
                  <p className="text-sm text-gray-500">Remote Participant</p>
                </div>
              </div>
            ))}

            {participants.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No other participants yet. Share the room name to invite others!
              </p>
            )}
          </div>
        </div>

        {/* Chrome AI Status & Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Real-Time Transcription (Chrome AI)
          </h2>

          {/* Chrome AI Availability Status */}
          <div className="mb-4">
            {isChromeAIAvailable ? (
              <div className="flex items-center text-green-700 bg-green-50 p-3 rounded-lg">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Chrome AI Available</span>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center text-yellow-800 mb-2">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Chrome AI Not Available</span>
                </div>
                <p className="text-yellow-700 text-sm mb-3">
                  Real-time transcription requires Chrome Canary with built-in AI enabled.
                </p>
                <button
                  onClick={() => setShowSetupInstructions(!showSetupInstructions)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                >
                  {showSetupInstructions ? 'Hide' : 'Show'} Setup Instructions
                </button>
                {showSetupInstructions && (
                  <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-x-auto text-gray-800">
                    {getChromeAISetupInstructions()}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Transcription Controls */}
          {isChromeAIAvailable && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                {isTranscribing ? (
                  <div className="flex items-center text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm font-medium">
                      Transcribing {activeTranscriptions.size} participant{activeTranscriptions.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">
                    No active transcriptions
                  </span>
                )}
              </div>
              <button
                onClick={clearTranscriptions}
                disabled={transcriptions.length === 0}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Clear Transcriptions
              </button>
            </div>
          )}

          {/* Transcription Error */}
          {transcriptionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">
                <strong>Transcription Error:</strong> {transcriptionError}
              </p>
            </div>
          )}

          {/* Transcription Display */}
          {isChromeAIAvailable && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Live Transcriptions
              </h3>
              {transcriptions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No transcriptions yet. Speak to see real-time transcriptions appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {transcriptions.map((transcription, index) => (
                    <div
                      key={`${transcription.participantId}-${transcription.timestamp}-${index}`}
                      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-blue-600 text-sm">
                          {transcription.participantName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(transcription.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-900 text-sm leading-relaxed">
                        {transcription.text}
                      </p>
                      {transcription.language && (
                        <span className="inline-block mt-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {transcription.language}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Translation Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Real-Time Translation
            </h2>

            {/* Language Selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="targetLanguage" className="text-sm font-medium text-gray-700">
                Translate to:
              </label>
              <select
                id="targetLanguage"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguageCode)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Translation Availability Status */}
          <div className="mb-4">
            {isTranslationAvailable ? (
              <div className="flex items-center text-green-700 bg-green-50 p-3 rounded-lg">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Translation Available</span>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center text-yellow-800 mb-2">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Translation Not Available</span>
                </div>
                <p className="text-yellow-700 text-sm mb-3">
                  Real-time translation requires Chrome AI features. Showing original transcriptions only.
                </p>
                <button
                  onClick={() => setShowTranslationInstructions(!showTranslationInstructions)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                >
                  {showTranslationInstructions ? 'Hide' : 'Show'} Setup Instructions
                </button>
                {showTranslationInstructions && (
                  <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-x-auto text-gray-800">
                    {getTranslationSetupInstructions()}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Translation Controls */}
          {isTranslationAvailable && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                {isTranslating ? (
                  <div className="flex items-center text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm font-medium">Translating...</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">
                    {translations.length} translation{translations.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  clearTranslations();
                  clearTranscriptions();
                }}
                disabled={translations.length === 0 && transcriptions.length === 0}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Translation Error */}
          {translationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">
                <strong>Translation Error:</strong> {translationError}
              </p>
            </div>
          )}

          {/* Translations Display */}
          {isTranslationAvailable && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Translated Messages
              </h3>
              {translations.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No translations yet. Transcriptions will be automatically translated to{' '}
                  {SUPPORTED_LANGUAGES[targetLanguage]}.
                </p>
              ) : (
                <div className="space-y-4">
                  {translations.map((translation, index) => (
                    <div
                      key={`${translation.timestamp}-${index}`}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-blue-600 text-sm">
                          {translation.participantName || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(translation.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Original Text */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Original:</p>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {translation.originalText}
                        </p>
                      </div>

                      {/* Translated Text */}
                      <div className="border-t border-gray-200 pt-3">
                        <p className="text-xs text-gray-500 mb-1">
                          Translated to {SUPPORTED_LANGUAGES[translation.targetLang as SupportedLanguageCode]}:
                        </p>
                        <p className="text-gray-900 text-sm leading-relaxed font-medium">
                          {translation.translatedText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text-to-Speech Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Text-to-Speech (TTS)
            </h2>

            {/* Toggle Controls */}
            <div className="flex items-center gap-6">
              {/* TTS Enable/Disable Toggle */}
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTTSEnabled(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Enable or disable text-to-speech"
                />
                <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  TTS {ttsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>

              {/* Subtitles Enable/Disable Toggle */}
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitlesEnabled}
                  onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Enable or disable subtitles"
                />
                <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  Subtitles {subtitlesEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          {/* TTS Availability Status */}
          <div className="mb-4">
            {isTTSAvailable ? (
              <div className="flex items-center text-green-700 bg-green-50 p-3 rounded-lg">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">TTS Available</span>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center text-yellow-800 mb-2">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">TTS Not Available</span>
                </div>
                <p className="text-yellow-700 text-sm mb-3">
                  Text-to-speech requires a browser with Web Speech API support.
                </p>
                <button
                  onClick={() => setShowTTSInstructions(!showTTSInstructions)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                >
                  {showTTSInstructions ? 'Hide' : 'Show'} Setup Instructions
                </button>
                {showTTSInstructions && (
                  <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-x-auto text-gray-800">
                    {getTTSSetupInstructions()}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* TTS Status */}
          {isTTSAvailable && ttsEnabled && (
            <div className="mb-4">
              {isSpeaking ? (
                <div className="flex items-center text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm font-medium">Speaking translation...</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">Ready to speak</span>
                </div>
              )}
            </div>
          )}

          {/* TTS Error */}
          {ttsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">
                <strong>TTS Error:</strong> {ttsError}
              </p>
            </div>
          )}

          {/* TTS Settings */}
          {isTTSAvailable && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Speech Settings
              </h3>
              <div className="space-y-4">
                {/* Volume Control */}
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>Volume</span>
                    <span className="font-medium">{Math.round((ttsSettings.volume || 0.75) * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ttsSettings.volume || 0.75}
                    onChange={(e) => updateTTSSettings({ volume: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Rate Control */}
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>Speed</span>
                    <span className="font-medium">{ttsSettings.rate || 1.0}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsSettings.rate || 1.0}
                    onChange={(e) => updateTTSSettings({ rate: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Pitch Control */}
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>Pitch</span>
                    <span className="font-medium">{ttsSettings.pitch || 1.0}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsSettings.pitch || 1.0}
                    onChange={(e) => updateTTSSettings({ pitch: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Room Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Room: {room.name}
          </p>
        </div>
      </div>

      {/* Subtitle Panel */}
      <SubtitlePanel
        translations={translations}
        speakingParticipants={speakingParticipants}
        isVisible={subtitlesEnabled}
        participantData={participantData}
      />
    </div>
  );
}
