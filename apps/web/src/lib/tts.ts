/**
 * Text-to-Speech Service using Web Speech API
 * Provides text-to-speech synthesis with voice selection and echo cancellation support
 */

export interface TTSOptions {
  rate?: number;   // Speaking rate (0.1-10, default 1.0)
  pitch?: number;  // Voice pitch (0-2, default 1.0)
  volume?: number; // Volume (0-1, default 0.75)
}

export interface TTSCapabilities {
  isAvailable: boolean;
  voiceCount: number;
  error?: string;
}

/**
 * TTSService - Singleton service for managing text-to-speech synthesis
 * Handles voice loading, selection, and speech synthesis
 */
export class TTSService {
  private static voices: SpeechSynthesisVoice[] = [];
  private static isInitialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Initialize TTS service and load available voices
   * Must be called before using the service
   */
  public static initialize(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Skip if already initialized or Speech Synthesis not available
    if (this.isInitialized || typeof window === 'undefined' || !window.speechSynthesis) {
      return Promise.resolve();
    }

    this.initPromise = new Promise<void>((resolve) => {
      // Load voices immediately if available
      this.voices = window.speechSynthesis.getVoices();

      if (this.voices.length > 0) {
        this.isInitialized = true;
        console.log(`[TTSService] Initialized with ${this.voices.length} voices`);
        resolve();
      } else {
        // Subscribe to voiceschanged event for async voice loading
        window.speechSynthesis.onvoiceschanged = () => {
          this.voices = window.speechSynthesis.getVoices();
          this.isInitialized = true;
          console.log(`[TTSService] Voices loaded: ${this.voices.length} available`);
          resolve();
        };

        // Fallback timeout in case voiceschanged never fires
        setTimeout(() => {
          if (!this.isInitialized) {
            this.voices = window.speechSynthesis.getVoices();
            this.isInitialized = true;
            console.warn(`[TTSService] Voices loaded via timeout: ${this.voices.length} available`);
            resolve();
          }
        }, 1000);
      }
    });

    return this.initPromise;
  }

  /**
   * Check if TTS is available in the browser
   */
  public static checkCapabilities(): TTSCapabilities {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return {
        isAvailable: false,
        voiceCount: 0,
        error: 'Speech Synthesis API not available in this browser',
      };
    }

    return {
      isAvailable: true,
      voiceCount: this.voices.length,
    };
  }

  /**
   * Find the best voice for the target language
   * Priority: Cloud voices (localService: false) > Google voices > Any voice for language
   *
   * @param lang - Target language code (e.g., 'en-US', 'ko-KR', 'ja-JP')
   * @returns Best available voice or null
   */
  private static findBestVoice(lang: string): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      console.warn('[TTSService] No voices available');
      return null;
    }

    // Extract base language (e.g., 'en' from 'en-US')
    const baseLang = lang.split('-')[0];

    // Priority 1: Non-local (cloud) voice with exact language match
    let voice = this.voices.find(v => v.lang === lang && !v.localService);

    // Priority 2: Google voice with exact language match (high quality)
    if (!voice) {
      voice = this.voices.find(v => v.lang === lang && v.name.includes('Google'));
    }

    // Priority 3: Any voice with exact language match
    if (!voice) {
      voice = this.voices.find(v => v.lang === lang);
    }

    // Priority 4: Non-local voice with base language match
    if (!voice) {
      voice = this.voices.find(v => v.lang.startsWith(baseLang) && !v.localService);
    }

    // Priority 5: Any voice with base language match
    if (!voice) {
      voice = this.voices.find(v => v.lang.startsWith(baseLang));
    }

    // Fallback: Use default voice
    if (!voice) {
      voice = this.voices.find(v => v.default) || this.voices[0];
      console.warn(`[TTSService] No voice found for ${lang}, using fallback: ${voice?.name}`);
    }

    return voice || null;
  }

  /**
   * Speak the given text in the specified language
   * Automatically cancels any ongoing speech
   *
   * @param text - Text to speak
   * @param lang - Language code (e.g., 'en-US', 'ko-KR')
   * @param options - Optional TTS settings (rate, pitch, volume)
   * @returns Promise that resolves when speech completes
   */
  public static speak(text: string, lang: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error('TTSService not initialized. Call initialize() first.'));
        return;
      }

      if (!text || text.trim().length === 0) {
        resolve(); // Nothing to speak
        return;
      }

      // Cancel any ongoing speech to implement cancel-and-replace strategy
      this.cancel();

      const voice = this.findBestVoice(lang);
      if (!voice) {
        console.warn(`[TTSService] No suitable voice for language: ${lang}`);
        reject(new Error(`No voice available for language: ${lang}`));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = lang;
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 0.75; // Default 75% volume to prevent echo

      // Event handlers
      utterance.onstart = () => {
        console.log(`[TTSService] Speaking: "${text.substring(0, 50)}..." (${lang})`);
      };

      utterance.onend = () => {
        console.log(`[TTSService] Speech completed`);
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('[TTSService] Speech error:', event);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Speak the utterance
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Stop any ongoing speech synthesis
   */
  public static cancel(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Get list of available voices for a specific language
   * Useful for debugging and voice selection testing
   *
   * @param lang - Optional language code to filter voices
   * @returns Array of available voices
   */
  public static getAvailableVoices(lang?: string): SpeechSynthesisVoice[] {
    if (!lang) {
      return this.voices;
    }

    const baseLang = lang.split('-')[0];
    return this.voices.filter(v =>
      v.lang === lang || v.lang.startsWith(baseLang)
    );
  }

  /**
   * Get recommended voices for each supported language
   * Useful for documentation and testing
   */
  public static getRecommendedVoices(): Record<string, SpeechSynthesisVoice | null> {
    const languages = ['en-US', 'ko-KR', 'ja-JP', 'zh-CN', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'ru-RU'];
    const recommendations: Record<string, SpeechSynthesisVoice | null> = {};

    for (const lang of languages) {
      recommendations[lang] = this.findBestVoice(lang);
    }

    return recommendations;
  }
}

/**
 * Get setup instructions for Text-to-Speech
 */
export function getTTSSetupInstructions(): string {
  return `
**Text-to-Speech Setup:**

BabelGopher uses the Web Speech API for text-to-speech synthesis.

**Supported Browsers:**
- Chrome/Edge: Full support with Google Cloud voices
- Safari: System voices (good quality)
- Firefox: eSpeak voices (moderate quality)

**For Best Experience:**
- Use headphones to prevent echo/feedback
- Enable microphone echo cancellation in browser settings
- Use Chrome/Edge for highest quality voices

**Troubleshooting:**
- If TTS doesn't work, check browser compatibility
- Refresh the page to reload available voices
- Check browser console for error messages
  `.trim();
}
