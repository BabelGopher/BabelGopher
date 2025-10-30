// TypeScript interfaces for Conference feature

export interface Participant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isSelf: boolean;
  isMuted: boolean;
}

export interface Subtitle {
  id: string;
  speakerName: string;
  originalText: string;
  translatedText: string;
  // Live partials while a segment is being spoken/translated
  originalTextPartial?: string;
  translatedTextPartial?: string;
  timestamp: number;
  isProcessing?: boolean; // For "..." indicator
  languageCode?: string; // Language code for translated text (e.g., 'ko', 'ja', 'es')
}

export interface ConferenceSettings {
  isTtsEnabled: boolean;
  isSubtitleEnabled: boolean;
  selectedLanguage: string;
  audioDevices: {
    microphone: string;
    speaker: string;
  };
  // Listening mode for remote audio vs synthesized TTS
  listeningMode?: "webrtc" | "tts_only";
}
