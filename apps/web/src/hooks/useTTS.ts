import { useState, useCallback, useEffect, useRef } from "react";
import { createComponentLogger } from "../lib/logger";
const log = createComponentLogger("useTTS");
import { TTSService, TTSOptions } from "../lib/tts";

/**
 * Message to be spoken by TTS
 */
export interface TTSMessage {
  text: string;
  lang: string;
  id: string; // Unique ID to detect changes
}

export interface UseTTSResult {
  isSpeaking: boolean;
  ttsError: string | null;
  isTTSAvailable: boolean;
  speak: (text: string, lang: string, options?: TTSOptions) => Promise<void>;
  cancel: () => void;
}

/**
 * Custom hook for text-to-speech using Web Speech API
 * Automatically speaks when message prop changes
 *
 * @param message - Message to speak (null to skip)
 * @param options - Optional TTS settings (rate, pitch, volume)
 */
export function useTTS(
  message: TTSMessage | null = null,
  options: TTSOptions = {}
): UseTTSResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTTSError] = useState<string | null>(null);
  const [isTTSAvailable, setIsTTSAvailable] = useState(false);
  const optionsRef = useRef<TTSOptions>(options);
  const queuedRef = useRef<{
    text: string;
    lang: string;
    options?: TTSOptions;
  } | null>(null);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize TTS service and check availability on mount
  useEffect(() => {
    // Try to unlock speech synthesis on first user gesture (autoplay policy)
    const unlock = () => {
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.resume();
        }
        // Re-initialize and re-check voices after user gesture
        TTSService.initialize().finally(() => {
          const caps = TTSService.checkCapabilities();
          setIsTTSAvailable(caps.isAvailable);
          if (caps.isAvailable) setTTSError(null);
        });
      } catch {}
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });

    const initTTS = async () => {
      try {
        await TTSService.initialize();
        const capabilities = TTSService.checkCapabilities();
        setIsTTSAvailable(capabilities.isAvailable);

        if (!capabilities.isAvailable) {
          setTTSError(capabilities.error || "TTS not available");
          log.warn("TTS not available", { error: capabilities.error });
        } else {
          log.info("TTS initialized", { voices: capabilities.voiceCount });
        }
      } catch (error) {
        log.error("Initialization failed", error as Error);
        setTTSError(
          error instanceof Error ? error.message : "TTS initialization failed"
        );
        setIsTTSAvailable(false);
      }
    };

    initTTS();

    // Cleanup: cancel any ongoing speech on unmount
    return () => {
      TTSService.cancel();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  /**
   * Speak text with specified language and options
   */
  const speak = useCallback(
    async (
      text: string,
      lang: string,
      speakOptions?: TTSOptions
    ): Promise<void> => {
      // If not yet available, queue once and return (will auto-flush on availability)
      if (!isTTSAvailable) {
        const effectiveOptions = speakOptions ?? optionsRef.current;
        queuedRef.current = { text, lang, options: effectiveOptions };
        log.warn("TTS not available yet; queued first utterance");
        return;
      }

      if (!text || text.trim().length === 0) {
        return;
      }

      setIsSpeaking(true);
      setTTSError(null);

      try {
        const effectiveOptions = speakOptions ?? optionsRef.current;
        await TTSService.speak(text, lang, effectiveOptions);
      } catch (error) {
        log.error("Speech failed", error as Error);
        setTTSError(
          error instanceof Error ? error.message : "Speech synthesis failed"
        );
      } finally {
        setIsSpeaking(false);
      }
    },
    [isTTSAvailable]
  );

  /**
   * Cancel any ongoing speech
   */
  const cancel = useCallback(() => {
    TTSService.cancel();
    setIsSpeaking(false);
  }, []);

  // Auto-speak when message changes
  useEffect(() => {
    if (message && message.text && isTTSAvailable) {
      speak(message.text, message.lang);
    }

    // Cleanup: cancel speech if message changes or component unmounts
    return () => {
      if (message) {
        cancel();
      }
    };
  }, [
    message?.id,
    message?.text,
    message?.lang,
    isTTSAvailable,
    speak,
    cancel,
  ]);

  // Flush queued utterance once TTS becomes available
  useEffect(() => {
    if (isTTSAvailable && queuedRef.current) {
      const q = queuedRef.current;
      queuedRef.current = null;
      // Fire and forget; errors handled inside speak
      speak(q.text, q.lang, q.options);
    }
  }, [isTTSAvailable, speak]);

  return {
    isSpeaking,
    ttsError,
    isTTSAvailable,
    speak,
    cancel,
  };
}

/**
 * Hook for managing TTS settings persistence
 */
export function useTTSSettings(defaults: TTSOptions = {}) {
  const [ttsSettings, setTTSSettings] = useState<TTSOptions>({
    rate: defaults.rate ?? 1.0,
    pitch: defaults.pitch ?? 1.0,
    volume: defaults.volume ?? 0.75,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("babelgopher:ttsSettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setTTSSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error("[useTTSSettings] Failed to load settings:", error);
    }
  }, []);

  // Persist settings to localStorage
  const updateTTSSettings = useCallback((newSettings: Partial<TTSOptions>) => {
    setTTSSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(
          "babelgopher:ttsSettings",
          JSON.stringify(updated)
        );
      } catch (error) {
        console.error("[useTTSSettings] Failed to save settings:", error);
      }
      return updated;
    });
  }, []);

  return {
    ttsSettings,
    updateTTSSettings,
  };
}
