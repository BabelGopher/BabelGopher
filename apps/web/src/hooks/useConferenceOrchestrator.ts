import { useEffect, useCallback, useRef, useMemo } from "react";
import { RoomEvent } from "livekit-client";
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

  const { isTtsEnabled, toggleTts, settings } = useSettings();

  // LiveKit WebRTC
  const {
    room,
    participants: liveKitParticipants,
    isConnecting,
    isConnected,
    isMuted,
    connect: connectLiveKit,
    disconnect: disconnectLiveKit,
    toggleMute: toggleLiveKitMute,
    setMicrophoneDevice,
    startPlayout,
    setRemoteAudioPlayout,
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
  const { isTTSAvailable, speak, isSpeaking: isTtsSpeaking } = useTTS();

  // Gate STT processing while TTS is speaking and for a short tail period
  const lastTtsEndAtRef = useRef(0);
  const TTS_TAIL_MS = 2200;

  // Maintain small buffer of recent TTS utterances to filter echo-recognition
  const lastTtsHistoryRef = useRef<{ norm: string; at: number }[]>([]);
  const normalizeText = useCallback((t: string) => {
    try {
      return t
        .toLowerCase()
        .replace(/[\p{P}\p{S}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      return (t || "").toLowerCase().trim();
    }
  }, []);
  const noteTtsUtterance = useCallback(
    (t: string) => {
      const norm = normalizeText(t);
      const now = Date.now();
      const pruned = lastTtsHistoryRef.current.filter(
        (x) => now - x.at < 10000
      );
      pruned.push({ norm, at: now });
      lastTtsHistoryRef.current = pruned.slice(-5);
    },
    [normalizeText]
  );
  const isLikelyTtsEcho = useCallback(
    (recognized: string) => {
      const norm = normalizeText(recognized);
      if (!norm) return false;
      const now = Date.now();
      for (const item of lastTtsHistoryRef.current) {
        if (now - item.at > 10000) continue;
        const a = norm;
        const b = item.norm;
        if (a === b) return true;
        // containment & length ratio heuristic
        const lenRatio =
          Math.min(a.length, b.length) / Math.max(a.length, b.length);
        if ((a.includes(b) || b.includes(a)) && lenRatio >= 0.7) return true;
      }
      return false;
    },
    [normalizeText]
  );

  // Track TTS end time to apply tail suppression
  useEffect(() => {
    if (!isTtsSpeaking) {
      lastTtsEndAtRef.current = Date.now();
    }
  }, [isTtsSpeaking]);

  // Apply listening mode to remote audio playout
  useEffect(() => {
    try {
      if (settings?.listeningMode === "tts_only") {
        setRemoteAudioPlayout(false);
      } else {
        setRemoteAudioPlayout(true);
      }
    } catch {}
  }, [settings?.listeningMode, setRemoteAudioPlayout]);

  // Track local participant ID for transcription
  const localParticipantIdRef = useRef<string | null>(null);
  const canStartSTT = useMemo(
    () =>
      isConnected &&
      !isMuted &&
      liveKitParticipants.some((p) => p.isSelf && !!p.sid),
    [isConnected, isMuted, liveKitParticipants]
  );
  // Track processed transcription ids to avoid duplicate processing
  const processedIdsRef = useRef<Set<string>>(new Set());
  // Keep a ref of subtitles to build updates without causing dependency loops
  const subtitlesRef = useRef<Subtitle[]>(subtitles);
  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  // Refs for managing debounced partial translations per segment
  const partialTranslateTimerRef = useRef<Map<string, number>>(new Map());
  const partialLastTextRef = useRef<Map<string, string>>(new Map());

  // Queue for remote TTS when in WebRTC mode; key is speakerId (participant sid)
  const pendingRemoteTtsRef = useRef<Map<string, string[]>>(new Map());
  const prevSpeakingMapRef = useRef<Map<string, boolean>>(new Map());
  const remoteTtsTailTimerRef = useRef<Map<string, number>>(new Map());

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

    // Do not start STT while muted
    if (isMuted) {
      showError("음소거 상태에서는 음성 인식을 시작할 수 없어요.");
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
    isMuted,
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

  // Auto stop/start STT when mute state changes
  useEffect(() => {
    if (!isConnected) return;
    if (isMuted) {
      if (isTranscribing) {
        stopTranscription();
      }
    } else {
      if (!isTranscribing && canStartSTT) {
        void startTranscription();
      }
    }
  }, [
    isConnected,
    isMuted,
    isTranscribing,
    canStartSTT,
    startTranscription,
    stopTranscription,
  ]);

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

    // Gate processing during/after TTS to avoid feedback loops
    if (isTtsSpeaking || Date.now() - lastTtsEndAtRef.current < TTS_TAIL_MS) {
      return;
    }

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

        // Drop if this looks like our own synthesized speech
        if (isLikelyTtsEcho(text)) {
          const subIdEcho = latestTranscription.segmentId
            ? `seg-${latestTranscription.segmentId}`
            : undefined;
          if (subIdEcho) {
            const current = subtitlesRef.current;
            const filtered = current.filter((s) => s.id !== subIdEcho);
            setSubtitles(filtered);
          }
          return;
        }

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
          // Remove any older processing-only entries (no partial)
          // and any other processing entries from the same speaker (stale partials)
          const cleaned = next.filter(
            (s) =>
              !(
                s.isProcessing &&
                (!s.originalTextPartial ||
                  s.originalTextPartial.trim().length === 0 ||
                  (s.speakerName === speaker && s.id !== subId))
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
          // Add and also prune stale processing items
          const combined = [...subtitles, subtitle].filter(
            (s) =>
              !(
                s.isProcessing &&
                (!s.originalTextPartial ||
                  s.originalTextPartial.trim().length === 0 ||
                  (s.speakerName === speaker && s.id !== subId))
              )
          );
          setSubtitles(combined.slice(-200));
        }

        // Broadcast original text for remote listeners via data channel
        try {
          if (room && room.localParticipant) {
            const payload = {
              type: "bg/transcription-final",
              text,
              sourceLang,
              segmentId: latestTranscription.segmentId || null,
              speakerId: participantId,
              speakerName: speaker,
              timestamp: latestTranscription.timestamp,
            };
            const data = new TextEncoder().encode(JSON.stringify(payload));
            // Reliable delivery for final messages (no topic)
            room.localParticipant.publishData(data, { reliable: true });
          }
        } catch {
          log.warn("Failed to publish transcription data");
        }

        // Speak translated text (TTS)
        if (isTtsEnabled && translatedText) {
          // Check TTS capability before attempting
          if (!isTTSAvailable) {
            log.warn("TTS not available, skipping speech output");
          } else {
            try {
              log.info("Speaking translated text", { text: translatedText });
              noteTtsUtterance(translatedText);
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
    isTtsSpeaking,
    room,
    isLikelyTtsEcho,
    noteTtsUtterance,
  ]);

  // Handle partial updates: create/update a subtitle entry with typing indicator
  useEffect(() => {
    if (partials.length === 0) return;

    // Gate partials during/after TTS to avoid echo artifacts showing up as typing
    if (isTtsSpeaking || Date.now() - lastTtsEndAtRef.current < TTS_TAIL_MS) {
      return;
    }

    const latest = partials[partials.length - 1];
    if (isLikelyTtsEcho(latest.text)) {
      return;
    }
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

    // Real-time translation for partials (debounced)
    try {
      const sourceLang = (latest.language || "auto") as string;
      const textToTranslate = latest.text.trim();

      // If target equals source, just mirror original into translated partial
      const mirrorOnly =
        sourceLang !== "auto" && sourceLang.slice(0, 2) === targetLanguage;

      // Skip if empty
      if (!textToTranslate) return;

      // Skip if text hasn't changed for this segment
      const lastText = partialLastTextRef.current.get(subId);
      if (lastText === textToTranslate) return;
      partialLastTextRef.current.set(subId, textToTranslate);

      // Clear any pending timer
      const existing = partialTranslateTimerRef.current.get(subId);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = window.setTimeout(async () => {
        try {
          let translatedPartial = textToTranslate;
          if (!mirrorOnly && isTranslationAvailable) {
            const maybe = await translateText(textToTranslate, {
              sourceLang,
              targetLang: targetLanguage,
              participantId: latest.participantId,
              participantName: latest.participantName,
            });
            if (maybe) translatedPartial = maybe;
          }

          // Ensure the partial hasn't advanced since we kicked off this translation
          const stillLatest =
            partialLastTextRef.current.get(subId) === textToTranslate;
          if (!stillLatest) return;

          // Update translatedTextPartial on the same subtitle entry
          const current = subtitlesRef.current;
          const idx = current.findIndex((s) => s.id === subId);
          if (idx >= 0) {
            const next = [...current];
            next[idx] = {
              ...next[idx],
              translatedTextPartial: translatedPartial,
              languageCode: targetLanguage,
            };
            setSubtitles(next);
          }
        } catch {
          // ignore partial translation errors
        }
      }, 120); // small debounce to avoid excessive calls while user is speaking

      partialTranslateTimerRef.current.set(subId, timer);
    } catch {
      // ignore partial translation scheduling errors
    }
  }, [
    partials,
    setSubtitles,
    isTtsSpeaking,
    isLikelyTtsEcho,
    isTranslationAvailable,
    targetLanguage,
    translateText,
  ]);

  // Receive remote transcription data via LiveKit
  useEffect(() => {
    if (!room) return;

    const onData = async (payload: Uint8Array) => {
      try {
        const json = new TextDecoder().decode(payload);
        const msg = JSON.parse(json) as {
          type: string;
          text: string;
          sourceLang?: string;
          segmentId?: string | null;
          speakerId?: string;
          speakerName?: string;
          timestamp?: number;
        };
        if (msg?.type !== "bg/transcription-final" || !msg.text) return;

        const speaker = msg.speakerName || "Speaker";
        const subId = msg.segmentId
          ? `remote-${msg.speakerId || "unk"}-${msg.segmentId}`
          : `remote-${Date.now()}-${Math.random()}`;

        // Translate for local user's target
        let translatedText = msg.text;
        try {
          if (isTranslationAvailable) {
            const translated = await translateText(msg.text, {
              sourceLang: (msg.sourceLang || "auto") as string,
              targetLang: targetLanguage,
              participantId: msg.speakerId || "remote",
              participantName: speaker,
            });
            if (translated) translatedText = translated;
          }
        } catch {}

        // Append subtitle
        const current = subtitlesRef.current;
        const idx = current.findIndex((s) => s.id === subId);
        if (idx >= 0) {
          const next = [...current];
          next[idx] = {
            ...next[idx],
            originalText: msg.text,
            translatedText,
            originalTextPartial: undefined,
            translatedTextPartial: undefined,
            languageCode: targetLanguage,
            isProcessing: false,
            timestamp: Date.now(),
          };
          setSubtitles(next);
        } else {
          const subtitle: Subtitle = {
            id: subId,
            speakerName: speaker,
            originalText: msg.text,
            translatedText,
            timestamp: Date.now(),
            languageCode: targetLanguage,
            isProcessing: false,
          };
          setSubtitles([...current, subtitle].slice(-200));
        }

        // In TTS-only listening mode, speak the translated text immediately
        if (settings?.listeningMode === "tts_only") {
          try {
            if (isTTSAvailable && translatedText) {
              noteTtsUtterance(translatedText);
              speak(translatedText, targetLanguage);
            }
          } catch {}
        } else if (settings?.listeningMode === "webrtc") {
          // In WebRTC mode, enqueue remote TTS to play after speaker stops
          try {
            const speakerId = msg.speakerId || "remote";
            const q = pendingRemoteTtsRef.current.get(speakerId) || [];
            if (translatedText && translatedText.trim().length > 0) {
              q.push(translatedText);
              pendingRemoteTtsRef.current.set(speakerId, q);
            }
          } catch {}
        }
      } catch {
        log.warn("Failed to handle data message");
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      try {
        room.off(RoomEvent.DataReceived, onData);
      } catch {}
    };
  }, [
    room,
    translateText,
    isTranslationAvailable,
    setSubtitles,
    targetLanguage,
    isTTSAvailable,
    speak,
    settings?.listeningMode,
    noteTtsUtterance,
  ]);

  // Flush queued remote TTS after a remote participant stops speaking (WebRTC mode)
  useEffect(() => {
    if (!globalParticipants || globalParticipants.length === 0) return;
    if (settings?.listeningMode !== "webrtc") return;

    const prev = prevSpeakingMapRef.current;
    const next = new Map<string, boolean>();

    globalParticipants.forEach((p) => {
      next.set(p.id, p.isSpeaking);
      const wasSpeaking = prev.get(p.id) || false;
      const nowSpeaking = p.isSpeaking;
      const isRemote = !p.isSelf;

      // Detect transition: speaking -> silent
      if (isRemote && wasSpeaking && !nowSpeaking) {
        try {
          // Debounce per speaker with a small tail window
          const existing = remoteTtsTailTimerRef.current.get(p.id);
          if (existing) clearTimeout(existing);
          const timer = window.setTimeout(async () => {
            try {
              const queue = pendingRemoteTtsRef.current.get(p.id) || [];
              if (queue.length === 0) return;
              if (!isTTSAvailable || !isTtsEnabled) return;

              // Speak items sequentially
              while (queue.length > 0) {
                const text = queue.shift() as string;
                if (!text) continue;
                noteTtsUtterance(text);
                await speak(text, targetLanguage);
              }
              pendingRemoteTtsRef.current.set(p.id, queue);
            } catch {}
          }, 400);
          remoteTtsTailTimerRef.current.set(p.id, timer);
        } catch {}
      }
    });

    // Save snapshot for next diff
    prevSpeakingMapRef.current = next;
  }, [
    globalParticipants,
    settings?.listeningMode,
    isTTSAvailable,
    isTtsEnabled,
    speak,
    targetLanguage,
    noteTtsUtterance,
  ]);

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
