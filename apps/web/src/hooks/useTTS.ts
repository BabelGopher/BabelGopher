import { useState, useCallback, useEffect } from 'react';
import { TTSService, TTSOptions } from '../lib/tts';

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

  // Initialize TTS service and check availability on mount
  useEffect(() => {
    const initTTS = async () => {
      try {
        await TTSService.initialize();
        const capabilities = TTSService.checkCapabilities();
        setIsTTSAvailable(capabilities.isAvailable);

        if (!capabilities.isAvailable) {
          setTTSError(capabilities.error || 'TTS not available');
          console.warn('[useTTS] TTS not available:', capabilities.error);
        } else {
          console.log(`[useTTS] TTS initialized with ${capabilities.voiceCount} voices`);
        }
      } catch (error) {
        console.error('[useTTS] Initialization failed:', error);
        setTTSError(error instanceof Error ? error.message : 'TTS initialization failed');
        setIsTTSAvailable(false);
      }
    };

    initTTS();

    // Cleanup: cancel any ongoing speech on unmount
    return () => {
      TTSService.cancel();
    };
  }, []);

  /**
   * Speak text with specified language and options
   */
  const speak = useCallback(
    async (text: string, lang: string, speakOptions?: TTSOptions): Promise<void> => {
      if (!isTTSAvailable) {
        console.warn('[useTTS] TTS not available, skipping speech');
        return;
      }

      if (!text || text.trim().length === 0) {
        return;
      }

      setIsSpeaking(true);
      setTTSError(null);

      try {
        await TTSService.speak(text, lang, speakOptions || options);
      } catch (error) {
        console.error('[useTTS] Speech failed:', error);
        setTTSError(error instanceof Error ? error.message : 'Speech synthesis failed');
      } finally {
        setIsSpeaking(false);
      }
    },
    [isTTSAvailable, options]
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
      speak(message.text, message.lang, options);
    }

    // Cleanup: cancel speech if message changes or component unmounts
    return () => {
      cancel();
    };
  }, [message?.id, message?.text, message?.lang, isTTSAvailable]); // Only trigger on message.id change

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
      const saved = localStorage.getItem('babelgopher:ttsSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setTTSSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('[useTTSSettings] Failed to load settings:', error);
    }
  }, []);

  // Persist settings to localStorage
  const updateTTSSettings = useCallback((newSettings: Partial<TTSOptions>) => {
    setTTSSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('babelgopher:ttsSettings', JSON.stringify(updated));
      } catch (error) {
        console.error('[useTTSSettings] Failed to save settings:', error);
      }
      return updated;
    });
  }, []);

  return {
    ttsSettings,
    updateTTSSettings,
  };
}
