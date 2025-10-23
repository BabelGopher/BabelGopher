/**
 * Chrome Built-in AI Service
 * Provides access to Chrome's Prompt API (Gemini Nano) for STT and other AI features
 */

// Type definitions for Chrome AI API (experimental)
declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities(): Promise<{
          available: 'readily' | 'after-download' | 'no';
        }>;
        create(options?: {
          systemPrompt?: string;
          temperature?: number;
          topK?: number;
        }): Promise<AILanguageModel>;
      };
      assistant?: any;
      summarizer?: any;
      translator?: any;
    };
  }
}

interface AILanguageModel {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): ReadableStream;
  countPromptTokens(input: string): Promise<number>;
  destroy(): void;
}

export interface ChromeAICapabilities {
  isAvailable: boolean;
  status: 'readily' | 'after-download' | 'no' | 'unknown';
  error?: string;
}

/**
 * Check if Chrome AI Prompt API is available
 */
export async function checkChromeAI(): Promise<ChromeAICapabilities> {
  try {
    if (!window.ai || !window.ai.languageModel) {
      return {
        isAvailable: false,
        status: 'no',
        error: 'Chrome AI API not found. Please use Chrome Canary with AI features enabled.',
      };
    }

    const capabilities = await window.ai.languageModel.capabilities();

    return {
      isAvailable: capabilities.available === 'readily' || capabilities.available === 'after-download',
      status: capabilities.available,
    };
  } catch (error) {
    console.error('Error checking Chrome AI capabilities:', error);
    return {
      isAvailable: false,
      status: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Initialize Chrome AI language model
 * @param systemPrompt - Optional system prompt to configure the model
 */
export async function initializePromptAPI(systemPrompt?: string): Promise<AILanguageModel | null> {
  try {
    const capabilities = await checkChromeAI();

    if (!capabilities.isAvailable) {
      console.warn('Chrome AI not available:', capabilities.error);
      return null;
    }

    // Wait for model download if needed
    if (capabilities.status === 'after-download') {
      console.log('Chrome AI model downloading... This may take a moment.');
    }

    const model = await window.ai!.languageModel!.create({
      systemPrompt: systemPrompt || 'You are a helpful speech-to-text assistant.',
      temperature: 0.1, // Low temperature for more consistent STT
      topK: 1,
    });

    return model;
  } catch (error) {
    console.error('Failed to initialize Prompt API:', error);
    return null;
  }
}

/**
 * Transcribe audio using Chrome Prompt API
 * NOTE: This is experimental - the actual API for audio transcription may differ
 * @param audioData - Audio data (format depends on what Prompt API accepts)
 * @param model - Initialized language model
 */
export async function transcribeAudio(
  audioData: string | Blob | ArrayBuffer,
  model: AILanguageModel
): Promise<string> {
  try {
    // TODO: Determine actual format Prompt API expects for audio
    // This is a placeholder implementation - actual API may be different

    let prompt: string;

    if (typeof audioData === 'string') {
      prompt = `Transcribe this audio: ${audioData}`;
    } else if (audioData instanceof Blob) {
      // Convert Blob to base64 or other format as needed
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioData);
      });
      prompt = `Transcribe this audio data: ${base64}`;
    } else {
      // ArrayBuffer handling
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(audioData))
      );
      prompt = `Transcribe this audio: ${base64}`;
    }

    const transcription = await model.prompt(prompt);
    return transcription.trim();
  } catch (error) {
    console.error('Audio transcription failed:', error);
    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Get Chrome AI setup instructions
 */
export function getChromeAISetupInstructions(): string {
  return `
# Chrome AI Setup Instructions

To use BabelGopher's AI-powered translation features, you need Chrome Canary with built-in AI enabled:

1. Install Chrome Canary: https://www.google.com/chrome/canary/

2. Enable AI features:
   - Navigate to: chrome://flags/#optimization-guide-on-device-model
   - Set to: "Enabled BypassPerfRequirement"

   - Navigate to: chrome://flags/#prompt-api-for-gemini-nano
   - Set to: "Enabled"

3. Restart Chrome Canary

4. Verify in console: window.ai?.languageModel should exist

5. First run may require model download (automatic)

For more information: https://developer.chrome.com/docs/ai/built-in
  `.trim();
}

/**
 * Format transcription text for display
 */
export function formatTranscription(text: string, participantName?: string): string {
  if (participantName) {
    return `[${participantName}]: ${text}`;
  }
  return text;
}
