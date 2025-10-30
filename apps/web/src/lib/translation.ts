/**
 * Chrome Built-in AI Translation Service (WICG Translator API)
 * Uses global self.Translator (and optional self.LanguageDetector) when available.
 */

// New WICG API globals
declare global {
  // Minimal shape of the Translator API for our usage
  var Translator:
    | {
        availability: (opts: {
          sourceLanguage: string;
          targetLanguage: string;
        }) => Promise<
          | "readily"
          | "after-download"
          | "downloadable"
          | "unavailable"
          | "available"
          | string
        >;
        create: (opts: {
          sourceLanguage: string;
          targetLanguage: string;
          // Optional progress monitor
          monitor?: (m: {
            addEventListener: (
              type: "downloadprogress",
              cb: (e: { loaded: number }) => void
            ) => void;
          }) => void;
        }) => Promise<{
          translate: (text: string) => Promise<string>;
          destroy?: () => void;
        }>;
      }
    | undefined;

  // Minimal shape of the LanguageDetector API for auto-detection
  var LanguageDetector:
    | {
        availability?: () => Promise<
          "readily" | "after-download" | "downloadable" | string
        >;
        create: (opts?: {
          monitor?: (m: {
            addEventListener: (
              type: "downloadprogress",
              cb: (e: { loaded: number }) => void
            ) => void;
          }) => void;
        }) => Promise<{
          detect: (
            text: string
          ) => Promise<Array<{ detectedLanguage: string; confidence: number }>>;
        }>;
      }
    | undefined;
}

export interface Translator {
  translate(text: string): Promise<string>;
  destroy?(): void;
}

export interface TranslationCapabilities {
  isAvailable: boolean;
  method: "translator-api" | "none";
  error?: string;
}

export interface TranslationOptions {
  sourceLang: string; // 'auto' for auto-detect or explicit code (e.g., 'en', 'ko')
  targetLang: string; // Target language code (e.g., 'en', 'ko', 'ja')
  onProgress?: (progress: number) => void; // optional: 0-100
}

// Supported languages for the translation feature
export const SUPPORTED_LANGUAGES = {
  en: "English",
  ko: "한국어 (Korean)",
  ja: "日本語 (Japanese)",
  zh: "中文 (Chinese)",
  es: "Español (Spanish)",
  fr: "Français (French)",
  de: "Deutsch (German)",
  it: "Italiano (Italian)",
  pt: "Português (Portuguese)",
  ru: "Русский (Russian)",
} as const;

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Check if Chrome Translation API or Prompt API is available
 */
import { createComponentLogger } from "./logger";
const log = createComponentLogger("Translation");

export async function checkTranslationCapabilities(): Promise<TranslationCapabilities> {
  try {
    const hasTranslator =
      typeof self !== "undefined" && "Translator" in self && !!self.Translator;
    if (hasTranslator) {
      // Probe a common pair; if downloadable/after-download, still treat as available
      try {
        const status = await self.Translator!.availability({
          sourceLanguage: "en",
          targetLanguage: "ko",
        });
        log.info("Translator availability", { status });
      } catch {
        // Ignore probe errors; API exists anyway
        log.warn("Translator availability probe failed");
      }
      return { isAvailable: true, method: "translator-api" };
    }

    log.warn("No Translator API available");
    return {
      isAvailable: false,
      method: "none",
      error: "Translator API not available",
    };
  } catch (error) {
    log.error("Error checking capabilities", error as Error);
    return {
      isAvailable: false,
      method: "none",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Initialize a translator instance
 */
export async function createTranslator(
  options: TranslationOptions
): Promise<Translator | null> {
  try {
    const caps = await checkTranslationCapabilities();
    if (!caps.isAvailable) {
      log.warn("Translation not available", { error: caps.error });
      return null;
    }

    if (typeof self !== "undefined" && self.Translator) {
      const source = options.sourceLang === "auto" ? "en" : options.sourceLang; // caller should detect when possible
      const status = await self.Translator.availability({
        sourceLanguage: source,
        targetLanguage: options.targetLang,
      });
      if (status === "unavailable") {
        log.warn("Language pair unavailable", {
          source,
          target: options.targetLang,
        });
        return null;
      }

      const native = await self.Translator.create({
        sourceLanguage: source,
        targetLanguage: options.targetLang,
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            const pct = Math.round(e.loaded * 100);
            log.info("Translator model download progress", { progress: pct });
            if (options.onProgress) {
              try {
                options.onProgress(pct);
              } catch {}
            }
          });
        },
      });

      return {
        translate: (text: string) => native.translate(text),
        destroy: native.destroy ? () => native.destroy!() : undefined,
      };
    }

    return null;
  } catch (error) {
    log.error("Failed to initialize translator", error as Error);
    return null;
  }
}

/**
 * One-shot translation function (creates translator, translates, destroys)
 */
export async function translateText(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const translator = await createTranslator(options);
  if (!translator) throw new Error("Failed to initialize translator");
  try {
    const start = performance.now();
    const translated = await translator.translate(text);
    const latency = Math.round(performance.now() - start);
    log.info("Translation latency", { ms: latency });
    return translated;
  } finally {
    translator.destroy?.();
  }
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  return (
    SUPPORTED_LANGUAGES[code as SupportedLanguageCode] || code.toUpperCase()
  );
}

/**
 * Get Chrome AI setup instructions for translation
 */
export function getTranslationSetupInstructions(): string {
  return `
# Chrome AI Translation Setup

To use BabelGopher's AI-powered translation features, you need Chrome Canary with built-in AI enabled:

1. Install Chrome Canary: https://www.google.com/chrome/canary/

2. Enable AI features:
   - Navigate to: chrome://flags/#optimization-guide-on-device-model
   - Set to: "Enabled BypassPerfRequirement"

   - Navigate to: chrome://flags/#prompt-api-for-gemini-nano
   - Set to: "Enabled"

   - (Optional) Navigate to: chrome://flags/#translation-api
   - Set to: "Enabled" (if available)

3. Restart Chrome Canary

4. Verify in console:
   - window.translation (Translator API) or
   - window.ai?.languageModel (Prompt API fallback)

5. First run may require model download (automatic)

For more information: https://developer.chrome.com/docs/ai/built-in
  `.trim();
}
