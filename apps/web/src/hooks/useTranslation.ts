import { useState, useCallback, useEffect, useRef } from "react";
import { createComponentLogger } from "../lib/logger";
const log = createComponentLogger("Translation");
import {
  checkTranslationCapabilities,
  createTranslator,
  TranslationOptions,
  Translator,
} from "../lib/translation";
import {
  isValidLanguageCode,
  SupportedLanguageCode,
} from "@/components/LanguageSelector";

export interface TranslationSegment {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  participantId?: string;
  participantName?: string;
}

export interface UseTranslationResult {
  translations: TranslationSegment[];
  isTranslating: boolean;
  translationError: string | null;
  isTranslationAvailable: boolean;
  isDownloading: boolean;
  downloadProgress: number; // 0-100
  translateText: (
    text: string,
    options: {
      sourceLang?: string;
      targetLang: string;
      participantId?: string;
      participantName?: string;
    }
  ) => Promise<string | null>;
  preloadTranslator: (targetLang: string, sourceLang?: string) => Promise<void>;
  clearTranslations: () => void;
}

/**
 * Custom hook for real-time translation using Chrome Translation API
 * Manages translation state and handles multiple translation requests
 */
export function useTranslation(): UseTranslationResult {
  const [translations, setTranslations] = useState<TranslationSegment[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslationAvailable, setIsTranslationAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Cache translators for different language pairs to avoid re-initialization
  const translatorsRef = useRef<Map<string, Translator>>(new Map());

  // Check translation availability on mount
  useEffect(() => {
    checkTranslationCapabilities().then((capabilities) => {
      setIsTranslationAvailable(capabilities.isAvailable);
      if (!capabilities.isAvailable) {
        setTranslationError(capabilities.error || "Translation not available");
      }
    });

    // Cleanup translators on unmount
    return () => {
      translatorsRef.current.forEach((translator) => {
        if (translator && translator.destroy) {
          translator.destroy();
        }
      });
      translatorsRef.current.clear();
    };
  }, []);

  /**
   * Get or create a translator for a specific language pair
   */
  const getTranslator = useCallback(
    async (sourceLang: string, targetLang: string) => {
      const key = `${sourceLang}->${targetLang}`;

      // Return cached translator if exists
      if (translatorsRef.current.has(key)) {
        return translatorsRef.current.get(key);
      }

      // Create new translator
      const translator = await createTranslator({
        sourceLang,
        targetLang,
        onProgress: (p) => {
          setIsDownloading(p < 100);
          setDownloadProgress(p);
        },
      });

      if (translator) {
        translatorsRef.current.set(key, translator);
      }

      return translator;
    },
    []
  );

  const preloadTranslator = useCallback(
    async (targetLang: string, sourceLang: string = "en") => {
      setIsDownloading(true);
      setDownloadProgress(0);
      try {
        const translator = await getTranslator(sourceLang, targetLang);
        if (translator) {
          // warm-up call with empty string is unnecessary; just caching is fine
        }
      } finally {
        setIsDownloading(false);
      }
    },
    [getTranslator]
  );

  /**
   * Translate text from source language to target language
   */
  const translateText = useCallback(
    async (
      text: string,
      options: {
        sourceLang?: string;
        targetLang: string;
        participantId?: string;
        participantName?: string;
      }
    ): Promise<string | null> => {
      if (!text || text.trim().length === 0) {
        return null;
      }

      if (!isTranslationAvailable) {
        console.warn("[Translation] Translation API not available");
        return null;
      }

      const sourceLang = options.sourceLang || "auto";
      const { targetLang, participantId, participantName } = options;

      setIsTranslating(true);
      setTranslationError(null);

      try {
        const startTime = performance.now();

        // Get or create translator for this language pair
        const translator = await getTranslator(sourceLang, targetLang);

        if (!translator) {
          throw new Error(
            `Failed to create translator for ${sourceLang} → ${targetLang}`
          );
        }

        // Perform translation with retry logic (for transient failures)
        let translatedText: string | null = null;
        let lastError: Error | null = null;
        const maxRetries = 2;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            translatedText = await translator.translate(text);
            break; // Success, exit retry loop
          } catch (translateError) {
            lastError =
              translateError instanceof Error
                ? translateError
                : new Error("Translation failed");
            console.warn(
              `[Translation] Attempt ${attempt + 1}/${maxRetries + 1} failed:`,
              lastError.message
            );

            if (attempt < maxRetries) {
              // Wait before retrying (50ms, 100ms)
              await new Promise((resolve) =>
                setTimeout(resolve, 50 * (attempt + 1))
              );
            }
          }
        }

        if (!translatedText) {
          // All retries failed, throw last error
          throw lastError || new Error("Translation failed after retries");
        }

        const latency = performance.now() - startTime;

        log.info("Translated", {
          sourceLang,
          targetLang,
          latencyMs: Math.round(latency),
        });

        // Add to translations history
        const segment: TranslationSegment = {
          originalText: text,
          translatedText,
          sourceLang,
          targetLang,
          timestamp: Date.now(),
          participantId,
          participantName,
        };

        setTranslations((prev) => [...prev, segment]);

        return translatedText;
      } catch (error) {
        log.error("Translation failed after all retries", error as Error);
        const errorMessage =
          error instanceof Error ? error.message : "Translation failed";
        setTranslationError(errorMessage);

        // Fallback: return original text
        log.warn("Falling back to original text");
        return text;
      } finally {
        setIsTranslating(false);
      }
    },
    [isTranslationAvailable, getTranslator]
  );

  /**
   * Clear all translations from history
   */
  const clearTranslations = useCallback(() => {
    setTranslations([]);
  }, []);

  return {
    translations,
    isTranslating,
    translationError,
    isTranslationAvailable,
    isDownloading,
    downloadProgress,
    translateText,
    preloadTranslator,
    clearTranslations,
  };
}

/**
 * Hook for managing user's target language preference
 */
export function useTargetLanguage(
  defaultLanguage: SupportedLanguageCode = "en"
) {
  const [targetLanguage, setTargetLanguage] =
    useState<SupportedLanguageCode>(defaultLanguage);

  // Persist target language to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("babelgopher:targetLanguage");
    // ✅ FIX: Validate language code from localStorage before setting state
    if (saved && isValidLanguageCode(saved)) {
      setTargetLanguage(saved);
    }
  }, []);

  const updateTargetLanguage = useCallback((lang: SupportedLanguageCode) => {
    setTargetLanguage(lang);
    localStorage.setItem("babelgopher:targetLanguage", lang);
  }, []);

  return {
    targetLanguage,
    setTargetLanguage: updateTargetLanguage,
  };
}
