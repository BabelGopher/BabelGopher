import { useEffect, useCallback, useRef, useMemo } from "react";
import { useLiveKit } from "./useLiveKit";
import { createComponentLogger } from "../lib/logger";
const log = createComponentLogger("Orchestrator");
import { useSTT } from "./useSTT";
import { useTranslation } from "./useTranslation";
import { useTTS } from "./useTTS";
import { useConferenceState } from "./useConferenceState";
import { useSettings } from "./useSettings";
import { useToasts } from "./useToasts";
import { Participant, Subtitle } from "../types/conference";

export interface UseConferenceOrchestratorOptions {
  roomName: string;
  participantName: string;
  targetLanguage: string; // User's preferred language for hearing translations
}

export interface UseConferenceOrchestratorResult {
  // LiveKit WebRTC
  isConnecting: boolean;
  isConnected: boolean;
  participants: Participant[];
  isMuted: boolean;
  toggleMute: () => void;
  setMicrophoneDevice: (deviceId: string) => void;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  startAudio: () => Promise<void>;

  // STT (Speech-to-Text)
  isTranscribing: boolean;
  startTranscription: () => Promise<void>;
  stopTranscription: () => void;

  // Translation
  isTranslationAvailable: boolean;

  // TTS (Text-to-Speech)
  isTtsEnabled: boolean;
  toggleTTS: () => void;

  // Subtitles
  subtitles: Subtitle[];

  // Capabilities
  capabilities: {
    sttAvailable: boolean;
    translationAvailable: boolean;
    ttsAvailable: boolean;
  };
  // STT readiness signal to avoid start race conditions
  canStartSTT: boolean;
  // Translation model download
  translationDownload: { inProgress: boolean; progress: number };
}

/**
 * Master orchestrator hook that coordinates the entire conference pipeline:
 * 1. LiveKit: WebRTC audio communication
 * 2. STT: Speech-to-text transcription (local participant only)
 * 3. Translation: Translate transcriptions to user's target language
 * 4. TTS: Speak translated text
 * 5. Subtitles: Display transcriptions and translations
 *
 * Pipeline flow for local participant:
 * Microphone → LiveKit → STT → Translation → TTS + Subtitles
 *
 * NOTE: Due to Web Speech API limitations, only the local participant's
 * speech is transcribed. Remote participants would need to run BabelGopher
 * on their end and share transcriptions via LiveKit data channel (future enhancement).
 */
export function useConferenceOrchestrator({
  roomName,
  participantName,
  targetLanguage,
}: UseConferenceOrchestratorOptions): UseConferenceOrchestratorResult {
  const { showError } = useToasts();
  const {
    participants: globalParticipants,
    subtitles,
    addSubtitle,
    setSubtitles,
    setParticipants,
  } = useConferenceState();

  const { isTtsEnabled, toggleTts } = useSettings();

  // LiveKit WebRTC
  const {
    participants: liveKitParticipants,
    isConnecting,
    isConnected,
    isMuted,
    connect: connectLiveKit,
    disconnect: disconnectLiveKit,
    toggleMute: toggleLiveKitMute,
    setMicrophoneDevice,
    startPlayout,
  } = useLiveKit({
    roomName,
    participantName,
    onError: (error) => {
      log.error("LiveKit error", error);
      showError(`Connection error: ${error.message}`);
    },
  });

  // Speech-to-Text
  const {
    transcriptions,
    partials,
    isTranscribing,
    isSTTAvailable,
    startLocalTranscription,
    stopTranscription: stopSTT,
  } = useSTT();

  // Translation
  const {
    isTranslationAvailable,
    translateText,
    isDownloading,
    downloadProgress,
    preloadTranslator,
  } = useTranslation();

  // Text-to-Speech
  const { isTTSAvailable, speak } = useTTS();

  // Track local participant ID for transcription
  const localParticipantIdRef = useRef<string | null>(null);
  const canStartSTT = useMemo(
    () => isConnected && liveKitParticipants.some((p) => p.isSelf && !!p.sid),
    [isConnected, liveKitParticipants]
  );
  // Track processed transcription ids to avoid duplicate processing
  const processedIdsRef = useRef<Set<string>>(new Set());
  // Keep a ref of subtitles to build updates without causing dependency loops
  const subtitlesRef = useRef<Subtitle[]>(subtitles);
  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  // Sync LiveKit participants to global state
  useEffect(() => {
    if (liveKitParticipants.length > 0) {
      const mapped: Participant[] = liveKitParticipants.map((lkp) => ({
        id: lkp.sid,
        name: lkp.name,
        isSpeaking: lkp.isSpeaking,
        isSelf: lkp.isSelf,
        isMuted: lkp.isMuted,
      }));
      setParticipants(mapped);

      // Update local participant ID
      const localParticipant = liveKitParticipants.find((p) => p.isSelf);
      if (localParticipant) {
        localParticipantIdRef.current = localParticipant.sid;
      }
    }
  }, [liveKitParticipants, setParticipants]);

  // Connect to LiveKit on mount
  useEffect(() => {
    connectLiveKit().catch((error) => {
      log.error("Failed to connect to LiveKit", error);
      showError("Failed to connect to conference room");
    });

    return () => {
      disconnectLiveKit();
    };
    // Run once on mount to avoid repeated token requests due to changing deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start transcription for local participant when connected
  const startTranscription = useCallback(async () => {
    if (!isConnected || !localParticipantIdRef.current) {
      log.warn(
        "Cannot start transcription: not connected or no local participant"
      );
      return;
    }

    // Prevent redundant starts if already transcribing
    if (isTranscribing) {
      log.info("STT already running, skipping start");
      return;
    }

    if (!isSTTAvailable) {
      showError("Speech recognition not available in this browser");
      return;
    }

    try {
      // STT language should reflect the speaker's language, not the target language.
      // Use browser locale as a heuristic (e.g., 'ko' from 'ko-KR').
      const navLang = (navigator.language || "en").slice(0, 2);
      const sttLanguage = navLang || "en";

      await startLocalTranscription(
        localParticipantIdRef.current,
        participantName,
        sttLanguage
      );
      log.info("Started transcription for local participant", {
        language: sttLanguage,
      });
    } catch (error) {
      log.error("Failed to start transcription", error as Error);
      showError("Failed to start speech recognition");
    }
  }, [
    isConnected,
    isSTTAvailable,
    isTranscribing,
    startLocalTranscription,
    participantName,
    showError,
  ]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    if (localParticipantIdRef.current) {
      stopSTT(localParticipantIdRef.current);
      log.info("Stopped transcription");
    }
  }, [stopSTT]);

  // Restart transcription when target language changes (to update STT language)
  const previousTargetLanguageRef = useRef(targetLanguage);
  useEffect(() => {
    // STT 언어는 브라우저 로케일 기반으로 유지. 타겟 변경 시 STT 재시작하지 않음.
    previousTargetLanguageRef.current = targetLanguage;
    // 번역 모델만 프리로드
    (async () => {
      try {
        await preloadTranslator(targetLanguage, "en");
      } catch {}
    })();
  }, [targetLanguage, preloadTranslator]);

  // Process new transcriptions: Translate and speak
  useEffect(() => {
    if (transcriptions.length === 0) return;

    const latestTranscription = transcriptions[transcriptions.length - 1];

    // Skip if not final or already processed
    if (!latestTranscription.isFinal) return;
    // Deduplicate by participant + timestamp to avoid re-processing
    const dedupeKey = `${latestTranscription.participantId}-${latestTranscription.timestamp}`;
    processedIdsRef.current ||= new Set<string>();
    if (processedIdsRef.current.has(dedupeKey)) return;
    processedIdsRef.current.add(dedupeKey);
    if (processedIdsRef.current.size > 500) {
      const it = processedIdsRef.current.values();
      const first = it.next().value as string | undefined;
      if (first) processedIdsRef.current.delete(first);
    }

    const processTranscription = async () => {
      try {
        const {
          text,
          participantName: speaker,
          participantId,
          language,
        } = latestTranscription;

        log.debug("Processing transcription", { speaker, text });

        // Very short segments are likely artifacts; drop them and cleanup any pending placeholder
        const subIdShort = latestTranscription.segmentId
          ? `seg-${latestTranscription.segmentId}`
          : undefined;
        if (text.trim().length < 3) {
          if (subIdShort) {
            const current = subtitlesRef.current;
            const filtered = current.filter((s) => s.id !== subIdShort);
            setSubtitles(filtered);
          }
          return;
        }

        // Translate to target language (auto-detect source language when possible)
        let translatedText = text;
        // Detect source language using LanguageDetector if available
        let sourceLang = language || "en";
        try {
          if (typeof self !== "undefined") {
            const globalSelf = self as unknown as {
              LanguageDetector?: {
                create: () => Promise<{
                  detect: (
                    t: string
                  ) => Promise<Array<{ detectedLanguage: string }>>;
                }>;
              };
            };
            if (globalSelf.LanguageDetector) {
              const detector = await globalSelf.LanguageDetector.create();
              const results = await detector.detect(text);
              if (Array.isArray(results) && results[0]?.detectedLanguage) {
                sourceLang = results[0].detectedLanguage.slice(0, 2);
              }
            }
          }
        } catch {
          // ignore detection errors, fallback to provided language
        }

        if (sourceLang !== targetLanguage) {
          // Check translation capability before attempting
          if (!isTranslationAvailable) {
            log.warn("Translation API not available, using original text");
            translatedText = text;
          } else {
            try {
              const translated = await translateText(text, {
                sourceLang,
                targetLang: targetLanguage,
                participantId,
                participantName: speaker,
              });

              if (translated) {
                translatedText = translated;
                log.info("Translated text", { from: text, to: translatedText });
              } else {
                log.warn("Translation returned null, using original text");
              }
            } catch (translationError) {
              log.error("Translation error", translationError as Error);
              // Fallback to original text on error
              translatedText = text;
            }
          }
        }

        // Add subtitle to display
        const subId = latestTranscription.segmentId
          ? `seg-${latestTranscription.segmentId}`
          : `subtitle-${Date.now()}-${Math.random()}`;

        // Update existing partial if present, otherwise add
        const idx = subtitles.findIndex((s) => s.id === subId);
        if (idx >= 0) {
          const next = [...subtitles];
          next[idx] = {
            ...next[idx],
            originalText: text,
            translatedText,
            originalTextPartial: undefined,
            translatedTextPartial: undefined,
            languageCode: targetLanguage,
            isProcessing: false,
            timestamp: Date.now(),
          };
          // Remove any older processing-only entries (no partial) to avoid lingering blink rows
          const cleaned = next.filter(
            (s) =>
              !(
                s.isProcessing &&
                (!s.originalTextPartial ||
                  s.originalTextPartial.trim().length === 0)
              )
          );
          setSubtitles(cleaned);
        } else {
          const subtitle: Subtitle = {
            id: subId,
            speakerName: speaker,
            originalText: text,
            translatedText,
            timestamp: Date.now(),
            languageCode: targetLanguage,
            isProcessing: false,
          };
          // Add and also prune processing-only items
          const combined = [...subtitles, subtitle].filter(
            (s) =>
              !(
                s.isProcessing &&
                (!s.originalTextPartial ||
                  s.originalTextPartial.trim().length === 0)
              )
          );
          setSubtitles(combined.slice(-200));
        }

        // Speak translated text (TTS)
        if (isTtsEnabled && translatedText) {
          // Check TTS capability before attempting
          if (!isTTSAvailable) {
            log.warn("TTS not available, skipping speech output");
          } else {
            try {
              log.info("Speaking translated text", { text: translatedText });
              speak(translatedText, targetLanguage);
            } catch (ttsError) {
              log.error("TTS error", ttsError as Error);
            }
          }
        }
      } catch (error) {
        log.error("Error processing transcription", error as Error);
      }
    };

    processTranscription().catch((error) => {
      log.error("Failed to process transcription", error as Error);
    });
  }, [
    transcriptions,
    isTranslationAvailable,
    isTtsEnabled,
    isTTSAvailable,
    targetLanguage,
    translateText,
    speak,
    addSubtitle,
    setSubtitles,
    subtitles,
  ]);

  // Handle partial updates: create/update a subtitle entry with typing indicator
  useEffect(() => {
    if (partials.length === 0) return;

    const latest = partials[partials.length - 1];
    const subId = `seg-${latest.segmentId}`;

    const prev = subtitlesRef.current;
    const idx = prev.findIndex((s) => s.id === subId);
    let updated: Subtitle[];
    if (idx >= 0) {
      // Don't regress finalized subtitles back to processing
      if (prev[idx].isProcessing === false) return;
      updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        speakerName: latest.participantName,
        originalTextPartial: latest.text,
        isProcessing: true,
      };
    } else {
      updated = [
        ...prev,
        {
          id: subId,
          speakerName: latest.participantName,
          originalText: "",
          originalTextPartial: latest.text,
          translatedText: "",
          timestamp: Date.now(),
          isProcessing: true,
        },
      ].slice(-200);
    }
    setSubtitles(updated);
  }, [partials, setSubtitles]);

  // Toggle mute wrapper
  const toggleMute = useCallback(() => {
    toggleLiveKitMute();
  }, [toggleLiveKitMute]);

  // Disconnect wrapper
  const disconnect = useCallback(async () => {
    stopTranscription();
    await disconnectLiveKit();
  }, [stopTranscription, disconnectLiveKit]);

  // Reconnect wrapper
  const reconnect = useCallback(async () => {
    await disconnect();
    await connectLiveKit();
  }, [disconnect, connectLiveKit]);

  // Start audio playout
  const startAudio = useCallback(async () => {
    await startPlayout();
  }, [startPlayout]);

  // Memoize capabilities object to prevent infinite loop in dependent useEffects
  const capabilities = useMemo(
    () => ({
      sttAvailable: isSTTAvailable,
      translationAvailable: isTranslationAvailable,
      ttsAvailable: isTTSAvailable,
    }),
    [isSTTAvailable, isTranslationAvailable, isTTSAvailable]
  );

  return {
    // LiveKit
    isConnecting,
    isConnected,
    participants: globalParticipants,
    isMuted,
    toggleMute,
    setMicrophoneDevice,
    disconnect,

    // STT
    isTranscribing,
    startTranscription,
    stopTranscription,

    // Translation
    isTranslationAvailable,

    // TTS
    isTtsEnabled,
    toggleTTS: toggleTts,

    // Subtitles
    subtitles,

    // Capabilities
    capabilities,
    canStartSTT,
    // Translation download status
    translationDownload: {
      inProgress: isDownloading,
      progress: downloadProgress,
    },
    // Live controls
    reconnect,
    startAudio,
  };
}
