/**
 * Text-to-Speech Service using Web Speech API
 * Provides text-to-speech synthesis with voice selection and echo cancellation support
 */

export interface TTSOptions {
  rate?: number; // Speaking rate (0.1-10, default 1.0)
  pitch?: number; // Voice pitch (0-2, default 1.0)
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
   * Normalize 2-letter language codes to common BCP-47 variants
   */
  private static normalizeLang(code: string): string {
    if (!code) return "en-US";
    if (code.includes("-")) return code;
    const map: Record<string, string> = {
      en: "en-US",
      ko: "ko-KR",
      ja: "ja-JP",
      zh: "zh-CN",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      it: "it-IT",
      pt: "pt-PT",
      ru: "ru-RU",
    };
    return map[code] || code;
  }

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
    if (
      this.isInitialized ||
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return Promise.resolve();
    }

    this.initPromise = new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;

      const finalize = (reason: string) => {
        this.isInitialized = true;
        console.log(
          `[TTSService] Initialized (${reason}) with ${this.voices.length} voices`
        );
        resolve();
      };

      const setVoices = () => {
        try {
          this.voices = synth.getVoices();
        } catch {
          this.voices = [];
        }
      };

      const onVoicesChanged = () => {
        setVoices();
        // Resolve when real voices are available
        if (this.voices.length > 0) {
          // Cleanup listener(s)
          try {
            synth.removeEventListener("voiceschanged", onVoicesChanged);
          } catch {}
          // Also clear property handler if set
          try {
            synth.onvoiceschanged = null;
          } catch {}
          finalize("voiceschanged");
        }
      };

      // Initial attempt
      setVoices();
      if (this.voices.length > 0) {
        finalize("immediate");
        return;
      }

      // Attach both property and event listener for maximum compatibility
      try {
        synth.addEventListener("voiceschanged", onVoicesChanged);
      } catch {}
      try {
        synth.onvoiceschanged = onVoicesChanged;
      } catch {}

      // Fallback timeout in case voiceschanged never fires (Safari quirks)
      const timeoutMs = 2000;
      setTimeout(() => {
        if (!this.isInitialized) {
          setVoices();
          // Do not depend on event forever; resolve so callers can poll capabilities
          try {
            synth.removeEventListener("voiceschanged", onVoicesChanged);
          } catch {}
          finalize("timeout");
        }
      }, timeoutMs);
    });

    return this.initPromise;
  }

  /**
   * Check if TTS is available in the browser
   */
  public static checkCapabilities(): TTSCapabilities {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return {
        isAvailable: false,
        voiceCount: 0,
        error: "Speech Synthesis API not available in this browser",
      };
    }

    return {
      isAvailable: this.voices.length > 0,
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
      console.warn("[TTSService] No voices available");
      return null;
    }

    // Extract base language (e.g., 'en' from 'en-US')
    const normalized = this.normalizeLang(lang);
    const baseLang = normalized.split("-")[0];

    // Priority 1: Non-local (cloud) voice with exact language match
    let voice = this.voices.find(
      (v) => v.lang === normalized && !v.localService
    );

    // Priority 2: Google voice with exact language match (high quality)
    if (!voice) {
      voice = this.voices.find(
        (v) => v.lang === normalized && v.name.includes("Google")
      );
    }

    // Priority 3: Any voice with exact language match
    if (!voice) {
      voice = this.voices.find((v) => v.lang === normalized);
    }

    // Priority 4: Non-local voice with base language match
    if (!voice) {
      voice = this.voices.find(
        (v) => v.lang.startsWith(baseLang) && !v.localService
      );
    }

    // Priority 5: Any voice with base language match
    if (!voice) {
      voice = this.voices.find((v) => v.lang.startsWith(baseLang));
    }

    // Fallback: Use default voice
    if (!voice) {
      voice = this.voices.find((v) => v.default) || this.voices[0];
      console.warn(
        `[TTSService] No voice found for ${lang}, using fallback: ${voice?.name}`
      );
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
  public static speak(
    text: string,
    lang: string,
    options: TTSOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(
          new Error("TTSService not initialized. Call initialize() first.")
        );
        return;
      }

      if (!text || text.trim().length === 0) {
        resolve(); // Nothing to speak
        return;
      }

      // Attempt to resume if the synth is paused due to autoplay policy
      try {
        if (typeof window !== "undefined" && window.speechSynthesis?.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}

      // Cancel any ongoing/pending speech first; then give synth a moment to flush
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          const synth = window.speechSynthesis;
          if (
            synth.speaking ||
            ("pending" in synth && (synth as { pending?: boolean }).pending)
          ) {
            synth.cancel();
          }
        }
      } catch {}

      const voice = this.findBestVoice(lang);
      if (!voice) {
        console.warn(`[TTSService] No suitable voice for language: ${lang}`);
        reject(new Error(`No voice available for language: ${lang}`));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      // Use the selected voice's language for best compatibility
      utterance.lang = voice.lang;
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 0.75; // Default 75% volume to prevent echo

      // Event handlers
      utterance.onstart = () => {
        console.log(
          `[TTSService] Speaking: "${text.substring(0, 50)}..." (${lang})`
        );
      };

      utterance.onend = () => {
        console.log(`[TTSService] Speech completed`);
        resolve();
      };

      utterance.onerror = (event) => {
        // Ignore 'interrupted' and 'canceled' errors as they're expected
        if (event.error === "interrupted" || event.error === "canceled") {
          console.log(`[TTSService] Speech ${event.error}`);
          resolve();
          return;
        }

        // Handle audio-hardware errors gracefully
        if (event.error === "audio-hardware" || event.error === "audio-busy") {
          console.warn("[TTSService] Audio device error:", event.error);
          console.warn(
            "[TTSService] This may be due to no audio output device or device permissions"
          );
          // Don't reject - allow app to continue
          resolve();
          return;
        }

        console.error("[TTSService] Speech error:", event.error, event);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Extra debug: log chosen voice
      try {
        console.log(`[TTSService] Using voice: ${voice.name} (${voice.lang})`);
      } catch {}

      // Speak the utterance after a short delay to avoid cancel/race conditions
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 20);
    });
  }

  /**
   * Stop any ongoing speech synthesis
   */
  public static cancel(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
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

    const baseLang = lang.split("-")[0];
    return this.voices.filter(
      (v) => v.lang === lang || v.lang.startsWith(baseLang)
    );
  }

  /**
   * Get recommended voices for each supported language
   * Useful for documentation and testing
   */
  public static getRecommendedVoices(): Record<
    string,
    SpeechSynthesisVoice | null
  > {
    const languages = [
      "en-US",
      "ko-KR",
      "ja-JP",
      "zh-CN",
      "es-ES",
      "fr-FR",
      "de-DE",
      "it-IT",
      "pt-PT",
      "ru-RU",
    ];
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
