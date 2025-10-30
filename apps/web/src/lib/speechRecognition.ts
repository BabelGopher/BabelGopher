/**
 * Web Speech API Service for Speech-to-Text
 * Uses SpeechRecognition API (webkit prefixed in Chrome)
 */

import { createComponentLogger } from './logger';

const log = createComponentLogger('SpeechRecognition');

// Type definitions for Web Speech API
declare global {
  // SpeechRecognition class
  class SpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: Event) => void) | null;
    onresult: ((event: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Export type alias for use in other files
export type SpeechRecognitionType = SpeechRecognition;

export interface SpeechRecognitionCapabilities {
  isAvailable: boolean;
  error?: string;
}

export interface SpeechRecognitionConfig {
  language?: string; // Language code (e.g., 'en-US', 'ko-KR', 'ja-JP')
  continuous?: boolean; // Keep recognizing continuously
  interimResults?: boolean; // Return interim results
  maxAlternatives?: number; // Maximum number of alternatives
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

/**
 * Check if Web Speech API is available
 */
export function checkSpeechRecognitionCapabilities(): SpeechRecognitionCapabilities {
  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return {
        isAvailable: false,
        error: 'Speech Recognition API not available. Please use a Chromium-based browser.',
      };
    }

    return {
      isAvailable: true,
    };
  } catch (error) {
    return {
      isAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a Speech Recognition instance
 * This uses the Web Speech API for real-time speech-to-text
 */
export function createSpeechRecognition(
  config: SpeechRecognitionConfig = {}
): SpeechRecognition | null {
  const capabilities = checkSpeechRecognitionCapabilities();

  if (!capabilities.isAvailable) {
    log.error('Not available', new Error(capabilities.error || 'Unknown error'));
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Configure recognition
  recognition.continuous = config.continuous ?? true; // Keep listening continuously
  recognition.interimResults = config.interimResults ?? true; // Get interim results for real-time feedback
  recognition.maxAlternatives = config.maxAlternatives ?? 1; // Get top result only
  recognition.lang = config.language || 'en-US'; // Default to English

  return recognition;
}

/**
 * Language code mapping for Speech Recognition API
 * Web Speech API uses BCP 47 language tags (e.g., 'en-US', 'ko-KR')
 */
export const SPEECH_LANGUAGE_MAP: Record<string, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
  th: 'th-TH',
  nl: 'nl-NL',
  pl: 'pl-PL',
  tr: 'tr-TR',
  vi: 'vi-VN',
  id: 'id-ID',
};

/**
 * Get BCP 47 language tag for Speech Recognition
 */
export function getSpeechLanguageCode(langCode: string): string {
  return SPEECH_LANGUAGE_MAP[langCode] || 'en-US';
}

/**
 * Helper: Parse SpeechRecognitionResultList into our result format
 */
export function parseSpeechResult(
  results: SpeechRecognitionResultList,
  resultIndex: number
): SpeechRecognitionResult[] {
  const parsedResults: SpeechRecognitionResult[] = [];

  for (let i = resultIndex; i < results.length; i++) {
    const result = results[i];
    const alternative = result[0]; // Get the top alternative

    parsedResults.push({
      transcript: alternative.transcript,
      confidence: alternative.confidence,
      isFinal: result.isFinal,
      timestamp: Date.now(),
    });
  }

  return parsedResults;
}

/**
 * Setup Speech Recognition with event handlers
 */
export interface SpeechRecognitionHandlers {
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function setupSpeechRecognition(
  recognition: SpeechRecognition,
  handlers: SpeechRecognitionHandlers
): void {
  // Handle results
  recognition.onresult = (event: Event) => {
    const speechEvent = event as SpeechRecognitionEvent;
    const results = parseSpeechResult(speechEvent.results, speechEvent.resultIndex);

    results.forEach((result) => {
      if (handlers.onResult) {
        handlers.onResult(result);
      }
    });
  };

  // Handle errors
  recognition.onerror = (event: Event) => {
    const errorEvent = event as SpeechRecognitionErrorEvent;
    log.error('Recognition error', new Error(errorEvent.error), {
      message: errorEvent.message
    });

    if (handlers.onError) {
      handlers.onError(errorEvent.error);
    }
  };

  // Handle start
  recognition.onstart = () => {
    log.debug('Started');
    if (handlers.onStart) {
      handlers.onStart();
    }
  };

  // Handle end
  recognition.onend = () => {
    log.debug('Ended');
    if (handlers.onEnd) {
      handlers.onEnd();
    }
  };
}
