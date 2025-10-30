import { useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ConferenceSettings } from '../types/conference';

/**
 * Convenience hook for accessing settings state and actions
 * Provides typed access to settings-specific state and dispatch methods
 */
export function useSettings() {
  const { state, dispatch } = useAppContext();

  // Memoize settings state to prevent unnecessary re-renders
  const settings = useMemo(() => state.settings, [state.settings]);

  // Settings actions
  const toggleTts = useCallback(() => {
    dispatch({ type: 'SETTINGS_TOGGLE_TTS' });
  }, [dispatch]);

  const toggleSubtitle = useCallback(() => {
    dispatch({ type: 'SETTINGS_TOGGLE_SUBTITLE' });
  }, [dispatch]);

  const setLanguage = useCallback(
    (language: string) => {
      dispatch({ type: 'SETTINGS_SET_LANGUAGE', payload: language });
    },
    [dispatch]
  );

  const setMicrophone = useCallback(
    (deviceId: string) => {
      dispatch({ type: 'SETTINGS_SET_MICROPHONE', payload: deviceId });
    },
    [dispatch]
  );

  const setSpeaker = useCallback(
    (deviceId: string) => {
      dispatch({ type: 'SETTINGS_SET_SPEAKER', payload: deviceId });
    },
    [dispatch]
  );

  const updateSettings = useCallback(
    (updates: Partial<ConferenceSettings>) => {
      dispatch({ type: 'SETTINGS_UPDATE', payload: updates });
    },
    [dispatch]
  );

  return {
    // State
    isTtsEnabled: settings.isTtsEnabled,
    isSubtitleEnabled: settings.isSubtitleEnabled,
    selectedLanguage: settings.selectedLanguage,
    audioDevices: settings.audioDevices,
    settings, // Full settings object if needed

    // Actions
    toggleTts,
    toggleSubtitle,
    setLanguage,
    setMicrophone,
    setSpeaker,
    updateSettings,
  };
}
