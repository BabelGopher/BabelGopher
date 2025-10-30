import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { AppState, AppAction, createInitialState } from "../types/appState";

/**
 * Context value type including state and dispatch
 */
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

/**
 * Create the context with undefined as initial value
 * (will be provided by AppProvider)
 */
const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Reducer function to handle all state updates
 */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Conference actions
    case "CONFERENCE_JOIN":
      return {
        ...state,
        conference: {
          ...state.conference,
          roomName: action.payload.roomName,
          isConnecting: true,
          isConnected: false,
        },
      };

    case "CONFERENCE_LEAVE":
      return {
        ...state,
        conference: {
          ...state.conference,
          roomName: null,
          participants: [],
          subtitles: [],
          isConnecting: false,
          isConnected: false,
        },
      };

    case "CONFERENCE_CONNECTING":
      return {
        ...state,
        conference: {
          ...state.conference,
          isConnecting: action.payload,
        },
      };

    case "CONFERENCE_CONNECTED":
      return {
        ...state,
        conference: {
          ...state.conference,
          isConnected: action.payload,
          isConnecting: false,
        },
      };

    case "PARTICIPANT_ADD":
      return {
        ...state,
        conference: {
          ...state.conference,
          participants: [...state.conference.participants, action.payload],
        },
      };

    case "PARTICIPANT_REMOVE":
      return {
        ...state,
        conference: {
          ...state.conference,
          participants: state.conference.participants.filter(
            (p) => p.id !== action.payload
          ),
        },
      };

    case "PARTICIPANT_UPDATE":
      return {
        ...state,
        conference: {
          ...state.conference,
          participants: state.conference.participants.map((p) =>
            p.id === action.payload.id ? action.payload : p
          ),
        },
      };

    case "PARTICIPANTS_SET":
      return {
        ...state,
        conference: {
          ...state.conference,
          participants: action.payload,
        },
      };

    case "PARTICIPANT_SPEAKING":
      return {
        ...state,
        conference: {
          ...state.conference,
          participants: state.conference.participants.map((p) => ({
            ...p,
            isSpeaking: p.id === action.payload,
          })),
        },
      };

    case "SUBTITLE_ADD": {
      const MAX = 200;
      return {
        ...state,
        conference: {
          ...state.conference,
          subtitles: [...state.conference.subtitles, action.payload].slice(
            -MAX
          ),
        },
      };
    }

    case "SUBTITLES_SET":
      return {
        ...state,
        conference: {
          ...state.conference,
          subtitles: action.payload,
        },
      };

    case "SUBTITLES_CLEAR":
      return {
        ...state,
        conference: {
          ...state.conference,
          subtitles: [],
        },
      };

    // Settings actions
    case "SETTINGS_TOGGLE_TTS":
      return {
        ...state,
        settings: {
          ...state.settings,
          isTtsEnabled: !state.settings.isTtsEnabled,
        },
      };

    case "SETTINGS_TOGGLE_SUBTITLE":
      return {
        ...state,
        settings: {
          ...state.settings,
          isSubtitleEnabled: !state.settings.isSubtitleEnabled,
        },
      };

    case "SETTINGS_SET_LANGUAGE":
      return {
        ...state,
        settings: {
          ...state.settings,
          selectedLanguage: action.payload,
        },
      };

    case "SETTINGS_SET_MICROPHONE":
      return {
        ...state,
        settings: {
          ...state.settings,
          audioDevices: {
            ...state.settings.audioDevices,
            microphone: action.payload,
          },
        },
      };

    case "SETTINGS_SET_SPEAKER":
      return {
        ...state,
        settings: {
          ...state.settings,
          audioDevices: {
            ...state.settings.audioDevices,
            speaker: action.payload,
          },
        },
      };

    case "SETTINGS_UPDATE":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    // UI actions
    case "TOAST_ADD":
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };

    case "TOAST_REMOVE":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };

    case "MODAL_OPEN":
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: true,
        },
      };

    case "MODAL_CLOSE":
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: false,
        },
      };

    default:
      return state;
  }
}

/**
 * AppProvider component props
 */
interface AppProviderProps {
  children: ReactNode;
  initialState?: AppState;
}

/**
 * AppProvider component - wraps the app to provide global state
 */
export function AppProvider({ children, initialState }: AppProviderProps) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialState || createInitialState()
  );

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Custom hook to use the app context
 * @throws Error if used outside AppProvider
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }

  return context;
}
