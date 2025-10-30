// Global application state types for Context API
import { Participant, Subtitle, ConferenceSettings } from "./conference";
import { ToastVariant } from "../components/ui/Toast";

/**
 * Toast item in the global state
 */
export interface AppToast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

/**
 * Modal visibility state
 */
export interface ModalState {
  settings: boolean;
  exitConfirm: boolean;
}

/**
 * Conference room state
 */
export interface ConferenceState {
  roomName: string | null;
  participants: Participant[];
  subtitles: Subtitle[];
  isConnecting: boolean;
  isConnected: boolean;
}

/**
 * Global application state shape
 */
export interface AppState {
  // Conference state
  conference: ConferenceState;

  // Settings state
  settings: ConferenceSettings;

  // UI state
  toasts: AppToast[];
  modals: ModalState;
}

/**
 * Conference-related actions
 */
export type ConferenceAction =
  | { type: "CONFERENCE_JOIN"; payload: { roomName: string } }
  | { type: "CONFERENCE_LEAVE" }
  | { type: "CONFERENCE_CONNECTING"; payload: boolean }
  | { type: "CONFERENCE_CONNECTED"; payload: boolean }
  | { type: "PARTICIPANT_ADD"; payload: Participant }
  | { type: "PARTICIPANT_REMOVE"; payload: string } // participant id
  | { type: "PARTICIPANT_UPDATE"; payload: Participant }
  | { type: "PARTICIPANTS_SET"; payload: Participant[] }
  | { type: "PARTICIPANT_SPEAKING"; payload: string } // participant id
  | { type: "SUBTITLE_ADD"; payload: Subtitle }
  | { type: "SUBTITLES_SET"; payload: Subtitle[] }
  | { type: "SUBTITLES_CLEAR" };

/**
 * Settings-related actions
 */
export type SettingsAction =
  | { type: "SETTINGS_TOGGLE_TTS" }
  | { type: "SETTINGS_TOGGLE_SUBTITLE" }
  | { type: "SETTINGS_SET_LANGUAGE"; payload: string }
  | { type: "SETTINGS_SET_MICROPHONE"; payload: string }
  | { type: "SETTINGS_SET_SPEAKER"; payload: string }
  | { type: "SETTINGS_UPDATE"; payload: Partial<ConferenceSettings> };

/**
 * UI-related actions
 */
export type UIAction =
  | { type: "TOAST_ADD"; payload: AppToast }
  | { type: "TOAST_REMOVE"; payload: string } // toast id
  | { type: "MODAL_OPEN"; payload: keyof ModalState }
  | { type: "MODAL_CLOSE"; payload: keyof ModalState };

/**
 * All possible actions in the app
 */
export type AppAction = ConferenceAction | SettingsAction | UIAction;

/**
 * Initial state factory
 */
export const createInitialState = (): AppState => ({
  conference: {
    roomName: null,
    participants: [],
    subtitles: [],
    isConnecting: false,
    isConnected: false,
  },
  settings: {
    isTtsEnabled: true,
    isSubtitleEnabled: true,
    selectedLanguage: "ko",
    audioDevices: {
      microphone: "default",
      speaker: "default",
    },
    listeningMode: "webrtc",
  },
  toasts: [],
  modals: {
    settings: false,
    exitConfirm: false,
  },
});
