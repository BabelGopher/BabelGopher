import React from 'react';
import { Toggle, Button } from '../ui';

interface ConferenceControlBarProps {
  isTtsEnabled: boolean;
  onToggleTts: () => void;
  isSubtitleEnabled: boolean;
  onToggleSubtitle: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'ja', name: '日本語' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'pt', name: 'Português' },
];

export function ConferenceControlBar({
  isTtsEnabled,
  onToggleTts,
  isSubtitleEnabled,
  onToggleSubtitle,
  selectedLanguage,
  onSelectLanguage,
  onOpenSettings,
  isMuted,
  onToggleMute,
}: ConferenceControlBarProps) {
  return (
    <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4">
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 justify-between">
        {/* Left: Mic Button & Toggles */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Microphone Mute Button */}
          <button
            onClick={onToggleMute}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 min-w-[120px] justify-center
              ${
                isMuted
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
              ${isMuted ? 'focus:ring-red-500' : 'focus:ring-green-500'}
            `}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <span className="text-lg">{isMuted ? '🔇' : '🎤'}</span>
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* TTS Toggle */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <span className="text-sm text-gray-300 font-medium">🔊 Translated Voice:</span>
            <Toggle
              checked={isTtsEnabled}
              onChange={onToggleTts}
              aria-label="Toggle translated voice"
            />
          </div>

          {/* Subtitle Toggle */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <span className="text-sm text-gray-300 font-medium">📖 Subtitles:</span>
            <Toggle
              checked={isSubtitleEnabled}
              onChange={onToggleSubtitle}
              aria-label="Toggle subtitles"
            />
          </div>
        </div>

        {/* Right: Language & Settings */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Language Selector */}
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            <label htmlFor="language-select" className="text-sm text-gray-300 font-medium whitespace-nowrap">
              🌍 Language:
            </label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-700 text-white border-2 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Select translation language"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Settings Button */}
          <Button
            variant="icon"
            size="md"
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="text-gray-300 hover:text-white"
          >
            ⚙️
          </Button>
        </div>
      </div>
    </footer>
  );
}
