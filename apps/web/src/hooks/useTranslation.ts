import { useState, useCallback, useEffect, useRef } from 'react';
import {
  checkTranslationCapabilities,
  createTranslator,
  TranslationOptions,
} from '../lib/translation';
import {
  isValidLanguageCode,
  SupportedLanguageCode,
} from '@/components/LanguageSelector';

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
  translateText: (
    text: string,
    options: {
      sourceLang?: string;
      targetLang: string;
      participantId?: string;
      participantName?: string;
    }
  ) => Promise<string | null>;
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

  // Cache translators for different language pairs to avoid re-initialization
  const translatorsRef = useRef<Map<string, any>>(new Map());

  // Check translation availability on mount
  useEffect(() => {
    checkTranslationCapabilities().then((capabilities) => {
      setIsTranslationAvailable(capabilities.isAvailable);
      if (!capabilities.isAvailable) {
        setTranslationError(capabilities.error || 'Translation not available');
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
      });

      if (translator) {
        translatorsRef.current.set(key, translator);
      }

      return translator;
    },
    []
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
        console.warn('[Translation] Translation API not available');
        return null;
      }

      const sourceLang = options.sourceLang || 'auto';
      const { targetLang, participantId, participantName } = options;

      setIsTranslating(true);
      setTranslationError(null);

      try {
        const startTime = performance.now();

        // Get or create translator for this language pair
        const translator = await getTranslator(sourceLang, targetLang);

        if (!translator) {
          throw new Error('Failed to create translator');
        }

        // Perform translation
        const translatedText = await translator.translate(text);
        const latency = performance.now() - startTime;

        console.log(
          `[Translation] ${sourceLang} → ${targetLang}: "${text.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..." (${latency.toFixed(0)}ms)`
        );

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
        console.error('[Translation] Translation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Translation failed';
        setTranslationError(errorMessage);
        return null;
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
    translateText,
    clearTranslations,
  };
}

/**
 * Hook for managing user's target language preference
 */
export function useTargetLanguage(defaultLanguage: SupportedLanguageCode = 'en') {
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguageCode>(defaultLanguage);

  // Persist target language to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('babelgopher:targetLanguage');
    // ✅ FIX: Validate language code from localStorage before setting state
    if (saved && isValidLanguageCode(saved)) {
      setTargetLanguage(saved);
    }
  }, []);

  const updateTargetLanguage = useCallback((lang: SupportedLanguageCode) => {
    setTargetLanguage(lang);
    localStorage.setItem('babelgopher:targetLanguage', lang);
  }, []);

  return {
    targetLanguage,
    setTargetLanguage: updateTargetLanguage,
  };
}
