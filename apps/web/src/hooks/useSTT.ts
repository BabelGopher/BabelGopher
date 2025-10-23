import { useState, useCallback, useEffect, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';
import { initializePromptAPI, transcribeAudio, checkChromeAI } from '../lib/chromeAI';

export interface TranscriptionSegment {
  participantId: string;
  participantName: string;
  text: string;
  timestamp: number;
  language?: string;
}

export interface UseSTTResult {
  transcriptions: TranscriptionSegment[];
  isTranscribing: boolean;
  transcriptionError: string | null;
  isChromeAIAvailable: boolean;
  startTranscription: (
    audioTrack: RemoteAudioTrack,
    participantId: string,
    participantName: string
  ) => Promise<void>;
  stopTranscription: (participantId: string) => void;
  clearTranscriptions: () => void;
}

interface ActiveTranscription {
  participantId: string;
  participantName: string;
  mediaRecorder: MediaRecorder;
  model: any; // AILanguageModel
}

/**
 * Custom hook for real-time speech-to-text using Chrome Prompt API
 * Handles audio chunking, transcription, and multi-participant management
 */
export function useSTT(): UseSTTResult {
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isChromeAIAvailable, setIsChromeAIAvailable] = useState(false);

  const activeTranscriptionsRef = useRef<Map<string, ActiveTranscription>>(new Map());

  // Check Chrome AI availability on mount
  useEffect(() => {
    checkChromeAI().then((capabilities) => {
      setIsChromeAIAvailable(capabilities.isAvailable);
      if (!capabilities.isAvailable) {
        setTranscriptionError(capabilities.error || 'Chrome AI not available');
      }
    });
  }, []);

  /**
   * Start transcribing audio from a remote participant
   */
  const startTranscription = useCallback(
    async (audioTrack: RemoteAudioTrack, participantId: string, participantName: string) => {
      try {
        setTranscriptionError(null);

        // Check if already transcribing this participant
        if (activeTranscriptionsRef.current.has(participantId)) {
          console.log(`Already transcribing participant: ${participantName}`);
          return;
        }

        // Initialize Prompt API
        const model = await initializePromptAPI(
          'You are a speech-to-text assistant. Transcribe the audio accurately.'
        );

        if (!model) {
          throw new Error('Failed to initialize Chrome AI Prompt API');
        }

        // Create MediaRecorder for audio chunking
        const mediaStream = audioTrack.mediaStream;
        if (!mediaStream) {
          throw new Error('Audio track has no media stream');
        }

        const mediaRecorder = new MediaRecorder(mediaStream, {
          mimeType: 'audio/webm',
        });

        // Handle audio chunks
        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            try {
              // Transcribe the audio chunk
              const startTime = performance.now();
              const text = await transcribeAudio(event.data, model);
              const latency = performance.now() - startTime;

              console.log(
                `[STT] ${participantName}: "${text}" (${latency.toFixed(0)}ms)`
              );

              // Add transcription to state
              if (text && text.length > 0) {
                setTranscriptions((prev) => [
                  ...prev,
                  {
                    participantId,
                    participantName,
                    text,
                    timestamp: Date.now(),
                  },
                ]);
              }
            } catch (error) {
              console.error(`Transcription error for ${participantName}:`, error);
              setTranscriptionError(
                error instanceof Error
                  ? error.message
                  : 'Transcription failed'
              );
            }
          }
        };

        mediaRecorder.onerror = (error) => {
          console.error(`MediaRecorder error for ${participantName}:`, error);
          setTranscriptionError('Audio recording error');
        };

        // Start recording with 1-second chunks (configurable)
        const chunkDurationMs = 1000; // 1 second chunks
        mediaRecorder.start(chunkDurationMs);

        // Store active transcription
        activeTranscriptionsRef.current.set(participantId, {
          participantId,
          participantName,
          mediaRecorder,
          model,
        });

        setIsTranscribing(true);

        console.log(`[STT] Started transcription for: ${participantName}`);
      } catch (error) {
        console.error('Failed to start transcription:', error);
        setTranscriptionError(
          error instanceof Error ? error.message : 'Failed to start transcription'
        );
      }
    },
    []
  );

  /**
   * Stop transcribing audio from a specific participant
   */
  const stopTranscription = useCallback((participantId: string) => {
    const activeTranscription = activeTranscriptionsRef.current.get(participantId);

    if (activeTranscription) {
      // Stop MediaRecorder
      if (activeTranscription.mediaRecorder.state !== 'inactive') {
        activeTranscription.mediaRecorder.stop();
      }

      // Destroy AI model
      if (activeTranscription.model && activeTranscription.model.destroy) {
        activeTranscription.model.destroy();
      }

      // Remove from active transcriptions
      activeTranscriptionsRef.current.delete(participantId);

      console.log(
        `[STT] Stopped transcription for: ${activeTranscription.participantName}`
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
    };
  }, [stopTranscription]);

  return {
    transcriptions,
    isTranscribing,
    transcriptionError,
    isChromeAIAvailable,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
  };
}
