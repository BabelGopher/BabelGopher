import { useState, useCallback, useEffect, useRef } from "react";
import { createComponentLogger } from "../lib/logger";
const log = createComponentLogger("STT");
import {
  checkSpeechRecognitionCapabilities,
  createSpeechRecognition,
  setupSpeechRecognition,
  getSpeechLanguageCode,
  SpeechRecognitionResult,
  SpeechRecognitionType,
} from "../lib/speechRecognition";

export interface TranscriptionSegment {
  participantId: string;
  participantName: string;
  text: string;
  timestamp: number;
  language?: string;
  confidence?: number;
  isFinal?: boolean;
  segmentId?: string;
}

export interface UseSTTResult {
  transcriptions: TranscriptionSegment[];
  isTranscribing: boolean;
  transcriptionError: string | null;
  isSTTAvailable: boolean;
  partials: {
    participantId: string;
    participantName: string;
    segmentId: string;
    text: string;
    timestamp: number;
    language?: string;
  }[];
  startLocalTranscription: (
    participantId: string,
    participantName: string,
    language?: string
  ) => Promise<void>;
  stopTranscription: (participantId: string) => void;
  clearTranscriptions: () => void;
}

interface ActiveTranscription {
  participantId: string;
  participantName: string;
  recognition: SpeechRecognitionType;
  language: string;
}

/**
 * Custom hook for real-time speech-to-text using Web Speech API
 * Handles local participant transcription (microphone input)
 *
 * NOTE: Web Speech API only works with the user's microphone via getUserMedia.
 * For remote participants, transcription must be done on their end and synced via data channel.
 */
export function useSTT(): UseSTTResult {
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>(
    []
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );
  const [isSTTAvailable, setIsSTTAvailable] = useState(false);
  const [partials, setPartials] = useState<
    {
      participantId: string;
      participantName: string;
      segmentId: string;
      text: string;
      timestamp: number;
      language?: string;
    }[]
  >([]);

  const activeTranscriptionsRef = useRef<Map<string, ActiveTranscription>>(
    new Map()
  );
  const isRestartingRef = useRef<Map<string, boolean>>(new Map()); // Track if currently restarting to prevent rapid loops
  const restartFailCountRef = useRef<Map<string, number>>(new Map()); // Track consecutive restart failures
  const hasErrorRef = useRef<Map<string, boolean>>(new Map()); // Track if error just occurred to prevent auto-restart
  const isRecognitionRunningRef = useRef<Map<string, boolean>>(new Map()); // Track recognition running state to avoid start() while running
  const lastErrorRef = useRef<Map<string, string | null>>(new Map()); // Track last error to decide restart strategy
  // Segmentation buffers per participant
  const segmentRef = useRef<
    Map<
      string,
      {
        bufferText: string;
        lastInterim: string;
        lastActivityAt: number;
        segmentId: string;
        timer?: number;
      }
    >
  >(new Map());
  const silenceMs = 500;

  // Check Speech Recognition availability on mount
  useEffect(() => {
    const capabilities = checkSpeechRecognitionCapabilities();
    setIsSTTAvailable(capabilities.isAvailable);
    if (!capabilities.isAvailable) {
      setTranscriptionError(
        capabilities.error || "Speech Recognition not available"
      );
    }
  }, []);

  /**
   * Start transcribing audio from the local participant (microphone)
   * Uses Web Speech API which only works with getUserMedia microphone input
   */
  const startLocalTranscription = useCallback(
    async (
      participantId: string,
      participantName: string,
      language: string = "en"
    ) => {
      try {
        setTranscriptionError(null);

        // Check if already transcribing this participant
        if (activeTranscriptionsRef.current.has(participantId)) {
          console.log(
            `[STT] Already transcribing participant: ${participantName}`
          );
          return;
        }

        if (!isSTTAvailable) {
          throw new Error("Speech Recognition not available");
        }

        // Create Speech Recognition instance
        const recognition = createSpeechRecognition({
          language: getSpeechLanguageCode(language),
          continuous: true,
          interimResults: true,
          maxAlternatives: 1,
        });

        if (!recognition) {
          throw new Error("Failed to create Speech Recognition instance");
        }

        // Setup event handlers
        setupSpeechRecognition(recognition, {
          onResult: (result: SpeechRecognitionResult) => {
            log.debug(
              `${participantName}: "${
                result.transcript
              }" (confidence: ${result.confidence.toFixed(2)}, final: ${
                result.isFinal
              })`
            );

            // VAD-like segmentation with inactivity window
            const key = participantId;
            let seg = segmentRef.current.get(key);
            if (!seg) {
              seg = {
                bufferText: "",
                lastInterim: "",
                lastActivityAt: Date.now(),
                segmentId: `${participantId}-${Date.now()}`,
              };
              segmentRef.current.set(key, seg);
            }

            seg.lastActivityAt = Date.now();
            if (result.isFinal) {
              // Append final text to buffer
              seg.bufferText = (
                seg.bufferText +
                " " +
                result.transcript
              ).trim();
              seg.lastInterim = "";
            } else {
              seg.lastInterim = result.transcript;
            }

            const partialText = (seg.bufferText + " " + seg.lastInterim).trim();
            if (partialText.length > 0) {
              setPartials((prev) => {
                const others = prev.filter(
                  (p) =>
                    !(
                      p.segmentId === seg!.segmentId &&
                      p.participantId === participantId
                    )
                );
                return [
                  ...others,
                  {
                    participantId,
                    participantName,
                    segmentId: seg!.segmentId,
                    text: partialText,
                    timestamp: Date.now(),
                    language,
                  },
                ];
              });
            }

            // Reset silence timer
            if (seg.timer) {
              clearTimeout(seg.timer);
            }
            seg.timer = window.setTimeout(() => {
              const finalText = seg!.bufferText.trim();
              if (finalText.length > 0) {
                // Push final transcription segment
                setTranscriptions((prev) => [
                  ...prev,
                  {
                    participantId,
                    participantName,
                    text: finalText,
                    timestamp: Date.now(),
                    language,
                    confidence: result.confidence,
                    isFinal: true,
                    segmentId: seg!.segmentId,
                  },
                ]);
              }

              // Clear partial of this segment
              setPartials((prev) =>
                prev.filter(
                  (p) =>
                    !(
                      p.segmentId === seg!.segmentId &&
                      p.participantId === participantId
                    )
                )
              );

              // Start next segment buffer
              segmentRef.current.set(key, {
                bufferText: "",
                lastInterim: "",
                lastActivityAt: Date.now(),
                segmentId: `${participantId}-${Date.now()}`,
              });
            }, silenceMs);
          },
          onError: (error: string) => {
            log.error(
              `Speech Recognition error for ${participantName}`,
              new Error(error)
            );
            setTranscriptionError(`Speech Recognition error: ${error}`);

            // Mark that an error occurred - prevents onEnd from auto-restarting
            hasErrorRef.current.set(participantId, true);
            lastErrorRef.current.set(participantId, error);
            // Do not restart here to avoid double restarts; let onEnd handle it deterministically
            if (error !== "no-speech" && error !== "audio-capture") {
              // For non-recoverable errors (aborted, not-allowed, etc.), log once
              log.warn(
                `Non-recoverable error "${error}", will not auto-restart`
              );
            }
          },
          onStart: () => {
            log.info(`Started listening for: ${participantName}`);
            // Clear error flag on successful start
            hasErrorRef.current.set(participantId, false);
            lastErrorRef.current.set(participantId, null);
            isRecognitionRunningRef.current.set(participantId, true);
            setIsTranscribing(true);
          },
          onEnd: () => {
            log.info(`Stopped listening for: ${participantName}`);
            // Mark recognition as not running as soon as we receive end
            isRecognitionRunningRef.current.set(participantId, false);

            // CRITICAL: Check if participant is still active BEFORE updating any state
            // If stopTranscription() was called, participant will already be deleted
            const active = activeTranscriptionsRef.current.get(participantId);

            if (!active) {
              // Participant was removed - this is an intentional stop, not auto-restart
              log.info("Participant removed, not restarting");
              setIsTranscribing(false);
              return;
            }

            // If ended due to an error, decide whether to restart based on error type
            const hadError = hasErrorRef.current.get(participantId);
            const lastError = lastErrorRef.current.get(participantId);
            if (hadError) {
              if (lastError === "no-speech" || lastError === "audio-capture") {
                log.info("Recoverable error, scheduling auto-restart...");
                // fallthrough to restart logic below
              } else {
                log.warn(
                  "Ended due to non-recoverable error, not auto-restarting"
                );
                // Clear tracking and treat as fully stopped so user can start again
                activeTranscriptionsRef.current.delete(participantId);
                isRestartingRef.current.delete(participantId);
                restartFailCountRef.current.delete(participantId);
                hasErrorRef.current.set(participantId, false);
                lastErrorRef.current.set(participantId, null);
                setIsTranscribing(false);
                return;
              }
              // Clear error markers before attempting restart
              hasErrorRef.current.set(participantId, false);
              lastErrorRef.current.set(participantId, null);
            }

            // Participant still active and no error - this is a natural end, should auto-restart
            const isRestarting = isRestartingRef.current.get(participantId);

            if (isRestarting) {
              // Already restarting, skip to prevent double-restart
              log.info("Already restarting, skipping duplicate restart");
              return;
            }

            // Check consecutive restart failures to prevent infinite error loops
            const failCount =
              restartFailCountRef.current.get(participantId) || 0;
            if (failCount >= 3) {
              log.error(
                "Too many consecutive restart failures, stopping auto-restart"
              );
              activeTranscriptionsRef.current.delete(participantId);
              isRestartingRef.current.delete(participantId);
              restartFailCountRef.current.delete(participantId);
              setIsTranscribing(false);
              return;
            }

            log.info("Auto-restarting continuous recognition...");
            isRestartingRef.current.set(participantId, true);

            // Add small delay to prevent rapid restart loops
            setTimeout(() => {
              try {
                // Triple-check participant is still active after delay
                if (!activeTranscriptionsRef.current.has(participantId)) {
                  log.info(
                    "Participant removed during cooldown, aborting restart"
                  );
                  setIsTranscribing(false);
                  isRestartingRef.current.set(participantId, false);
                  return;
                }

                const isRunning =
                  isRecognitionRunningRef.current.get(participantId);
                if (!isRunning) {
                  // Mark as starting to avoid concurrent start() calls before onstart fires
                  isRecognitionRunningRef.current.set(participantId, true);
                  recognition.start();
                  // Reset fail count on successful start
                  restartFailCountRef.current.set(participantId, 0);
                  // Only update isTranscribing after successful restart
                  setIsTranscribing(true);
                } else {
                  log.info(
                    "Skip restart after cooldown: recognition already running"
                  );
                }
              } catch (error) {
                log.error("Failed to restart recognition", error as Error);
                // Increment fail count
                const newFailCount =
                  (restartFailCountRef.current.get(participantId) || 0) + 1;
                restartFailCountRef.current.set(participantId, newFailCount);
                setIsTranscribing(false);
                // Ensure running flag is cleared if start threw
                isRecognitionRunningRef.current.set(participantId, false);
              } finally {
                isRestartingRef.current.set(participantId, false);
              }
            }, 250); // 250ms cooldown between restarts
          },
        });

        // Start recognition
        // Guard and mark running before initial start to prevent races
        isRecognitionRunningRef.current.set(participantId, true);
        try {
          recognition.start();
        } catch (err) {
          isRecognitionRunningRef.current.set(participantId, false);
          throw err;
        }

        // Store active transcription
        activeTranscriptionsRef.current.set(participantId, {
          participantId,
          participantName,
          recognition,
          language,
        });

        log.info(`Started transcription for: ${participantName} (${language})`);
      } catch (error) {
        log.error("Failed to start transcription", error as Error);
        setTranscriptionError(
          error instanceof Error
            ? error.message
            : "Failed to start transcription"
        );
      }
    },
    [isSTTAvailable]
  );

  /**
   * Stop transcribing audio from a specific participant
   */
  const stopTranscription = useCallback((participantId: string) => {
    const activeTranscription =
      activeTranscriptionsRef.current.get(participantId);

    if (activeTranscription) {
      // Clear segmentation timer for this participant
      const seg = segmentRef.current.get(participantId);
      if (seg?.timer) {
        clearTimeout(seg.timer);
      }
      segmentRef.current.delete(participantId);
      // CRITICAL: Delete from map BEFORE calling stop() to prevent race condition.
      // If stop() is called first, onEnd might fire and see the participant is still
      // active in the map, causing it to restart transcription, creating a memory leak.
      activeTranscriptionsRef.current.delete(participantId);
      isRestartingRef.current.delete(participantId); // Also clear restart flag
      restartFailCountRef.current.delete(participantId); // Clear fail counter
      hasErrorRef.current.delete(participantId); // Clear error flag
      isRecognitionRunningRef.current.delete(participantId); // Clear running state

      // Now stop Speech Recognition
      try {
        activeTranscription.recognition.stop();
      } catch (error) {
        log.error("Error stopping recognition", error as Error);
      }

      log.info(
        `Stopped transcription for: ${activeTranscription.participantName}`
      );

      // Update isTranscribing state
      if (activeTranscriptionsRef.current.size === 0) {
        setIsTranscribing(false);
      }
    }
  }, []);

  /**
   * Clear all transcriptions from display
   */
  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all active transcriptions
      activeTranscriptionsRef.current.forEach((_, participantId) => {
        stopTranscription(participantId);
      });
      // Clear any remaining segmentation timers
      segmentRef.current.forEach((seg) => {
        if (seg.timer) clearTimeout(seg.timer);
      });
      segmentRef.current.clear();
    };
  }, [stopTranscription]);

  return {
    transcriptions,
    partials,
    isTranscribing,
    transcriptionError,
    isSTTAvailable,
    startLocalTranscription,
    stopTranscription,
    clearTranscriptions,
  };
}
