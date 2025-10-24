import React from 'react';
import { Subtitle } from '../../types/conference';

interface SubtitleEntryProps {
  subtitle: Subtitle;
}

export function SubtitleEntry({ subtitle }: SubtitleEntryProps) {
  return (
    <div
      className="mb-3 p-3 rounded-lg bg-gray-800 animate-fade-in-up"
      role="article"
      aria-label={`${subtitle.speakerName} said: ${subtitle.originalText}`}
    >
      {/* Speaker Name */}
      <p className="text-sm text-blue-400 font-semibold mb-1">{subtitle.speakerName}:</p>

      {/* Original Text */}
      <p className="text-white text-base leading-relaxed">{subtitle.originalText}</p>

      {/* Translated Text */}
      <p className="text-purple-300 text-sm italic mt-1.5 flex items-center gap-2">
        <span className="text-purple-400" aria-hidden="true">
          📖
        </span>
        {subtitle.isProcessing ? (
          <span className="flex items-center gap-0.5">
            <span className="animate-blink-1">.</span>
            <span className="animate-blink-2">.</span>
            <span className="animate-blink-3">.</span>
          </span>
        ) : (
          <span>{subtitle.translatedText}</span>
        )}
      </p>
    </div>
  );
}
