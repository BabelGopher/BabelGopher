/**
 * localStorage utilities for persisting user preferences in BabelGopher
 */

const STORAGE_KEYS = {
  LANGUAGE: 'babelgopher_language',
  MIC_DEVICE: 'babelgopher_mic_device',
  SPEAKER_DEVICE: 'babelgopher_speaker_device',
  SPEAKER_VOLUME: 'babelgopher_speaker_volume',
} as const;

/**
 * Safe localStorage operations with fallback for SSR and private browsing
 */
const isStorageAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const saveLanguage = (language: string): void => {
  if (isStorageAvailable()) {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }
};

export const getLanguage = (defaultLanguage: string = 'en'): string => {
  if (!isStorageAvailable()) return defaultLanguage;

  try {
    return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || defaultLanguage;
  } catch {
    return defaultLanguage;
  }
};

export const saveMicDevice = (deviceId: string): void => {
  if (isStorageAvailable()) {
    localStorage.setItem(STORAGE_KEYS.MIC_DEVICE, deviceId);
  }
};

export const getMicDevice = (defaultDevice: string = 'default'): string => {
  if (!isStorageAvailable()) return defaultDevice;

  try {
    return localStorage.getItem(STORAGE_KEYS.MIC_DEVICE) || defaultDevice;
  } catch {
    return defaultDevice;
  }
};

export const saveSpeakerDevice = (deviceId: string): void => {
  if (isStorageAvailable()) {
    localStorage.setItem(STORAGE_KEYS.SPEAKER_DEVICE, deviceId);
  }
};

export const getSpeakerDevice = (defaultDevice: string = 'default'): string => {
  if (!isStorageAvailable()) return defaultDevice;

  try {
    return localStorage.getItem(STORAGE_KEYS.SPEAKER_DEVICE) || defaultDevice;
  } catch {
    return defaultDevice;
  }
};

export const saveSpeakerVolume = (volume: number): void => {
  if (isStorageAvailable()) {
    localStorage.setItem(STORAGE_KEYS.SPEAKER_VOLUME, String(volume));
  }
};

export const getSpeakerVolume = (defaultVolume: number = 80): number => {
  if (!isStorageAvailable()) return defaultVolume;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SPEAKER_VOLUME);
    if (stored) {
      const parsed = parseInt(stored, 10);
      return isNaN(parsed) ? defaultVolume : Math.min(100, Math.max(0, parsed));
    }
    return defaultVolume;
  } catch {
    return defaultVolume;
  }
};
