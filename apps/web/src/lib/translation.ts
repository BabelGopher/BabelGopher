/**
 * Chrome Built-in AI Translation Service
 * Provides access to Chrome's Translator API or fallback to Prompt API for translation
 */

// Type definitions for Chrome Translation API (experimental)
declare global {
  interface Window {
    translation?: {
      canTranslate?(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
      createTranslator?(options: {
        sourceLanguage: string;
        targetLanguage: string;
      }): Promise<Translator>;
    };
  }
}

interface Translator {
  translate(text: string): Promise<string>;
  destroy?(): void;
}

export interface TranslationCapabilities {
  isAvailable: boolean;
  method: 'translator-api' | 'prompt-api' | 'none';
  error?: string;
}

export interface TranslationOptions {
  sourceLang: string; // 'auto' for auto-detect or explicit code (e.g., 'en', 'ko')
  targetLang: string; // Target language code (e.g., 'en', 'ko', 'ja')
}

// Supported languages for the translation feature
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  ko: '한국어 (Korean)',
  ja: '日本語 (Japanese)',
  zh: '中文 (Chinese)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  it: 'Italiano (Italian)',
  pt: 'Português (Portuguese)',
  ru: 'Русский (Russian)',
} as const;

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Check if Chrome Translation API or Prompt API is available
 */
export async function checkTranslationCapabilities(): Promise<TranslationCapabilities> {
  try {
    // Check for dedicated Translator API first
    if (window.translation && window.translation.createTranslator) {
      return {
        isAvailable: true,
        method: 'translator-api',
      };
    }

    // Fallback to Prompt API (used for translation via prompts)
    if (window.ai && window.ai.languageModel) {
      const capabilities = await window.ai.languageModel.capabilities();
      if (capabilities.available === 'readily' || capabilities.available === 'after-download') {
        return {
          isAvailable: true,
          method: 'prompt-api',
        };
      }
    }

    return {
      isAvailable: false,
      method: 'none',
      error: 'Neither Translator API nor Prompt API available. Please use Chrome Canary with AI features enabled.',
    };
  } catch (error) {
    console.error('Error checking translation capabilities:', error);
    return {
      isAvailable: false,
      method: 'none',
      error: error instanceof Error ? error.message : 'Unknown error',
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
    const capabilities = await checkTranslationCapabilities();

    if (!capabilities.isAvailable) {
      console.warn('Translation not available:', capabilities.error);
      return null;
    }

    // Use dedicated Translator API if available
    if (capabilities.method === 'translator-api' && window.translation?.createTranslator) {
      console.log('[Translation] Using Chrome Translator API');
      const translator = await window.translation.createTranslator({
        sourceLanguage: options.sourceLang === 'auto' ? 'en' : options.sourceLang,
        targetLanguage: options.targetLang,
      });
      return translator;
    }

    // Fallback: Use Prompt API for translation
    if (capabilities.method === 'prompt-api' && window.ai?.languageModel) {
      console.log('[Translation] Using Prompt API for translation');

      const systemPrompt = `You are a professional translator. Translate the given text from ${
        options.sourceLang === 'auto' ? 'the detected language' : options.sourceLang
      } to ${options.targetLang}.

IMPORTANT RULES:
1. Return ONLY the translated text, no explanations or additional context
2. Preserve the tone and meaning of the original text
3. If the input is already in the target language, return it unchanged
4. For proper nouns and names, keep them in their original form
5. Be concise and accurate`;

      const model = await window.ai.languageModel.create({
        systemPrompt,
        temperature: 0.3, // Lower temperature for more consistent translations
        topK: 3,
      });

      // Create a wrapper that implements the Translator interface
      return {
        translate: async (text: string): Promise<string> => {
          if (!text || text.trim().length === 0) {
            return '';
          }

          try {
            const prompt = `Translate this text to ${
              SUPPORTED_LANGUAGES[options.targetLang as SupportedLanguageCode] || options.targetLang
            }:\n\n${text}`;

            const translation = await model.prompt(prompt);
            return translation.trim();
          } catch (error) {
            console.error('[Translation] Translation failed:', error);
            throw new Error('Translation failed');
          }
        },
        destroy: () => {
          if (model && typeof model.destroy === 'function') {
            model.destroy();
          }
        },
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to initialize translator:', error);
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

  if (!translator) {
    throw new Error('Failed to initialize translator');
  }

  try {
    const startTime = performance.now();
    const translated = await translator.translate(text);
    const latency = performance.now() - startTime;

    console.log(`[Translation] Latency: ${latency.toFixed(0)}ms, Input: "${text.substring(0, 50)}...", Output: "${translated.substring(0, 50)}..."`);

    return translated;
  } finally {
    if (translator.destroy) {
      translator.destroy();
    }
  }
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES[code as SupportedLanguageCode] || code.toUpperCase();
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
