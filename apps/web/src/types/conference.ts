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
  timestamp: number;
  isProcessing?: boolean; // For "..." indicator
}

export interface ConferenceSettings {
  isTtsEnabled: boolean;
  isSubtitleEnabled: boolean;
  selectedLanguage: string;
  audioDevices: {
    microphone: string;
    speaker: string;
  };
}
