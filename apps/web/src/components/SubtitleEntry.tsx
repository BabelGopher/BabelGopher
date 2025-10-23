/**
 * SubtitleEntry Component
 * Displays a single subtitle entry with speaker information, original text, and translated text
 */

import { TranslationSegment } from '@/hooks/useTranslation';

interface SubtitleEntryProps {
  subtitle: TranslationSegment;
  isSpeaking: boolean;
}

/**
 * Hash function to generate consistent color index for participant
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Get color class for speaker based on their ID
 */
// ✅ FIX: Export function for use in SubtitlePanel
export function getSpeakerColor(participantId: string): string {
  const colors = [
    'bg-blue-600',
    'bg-green-600',
    'bg-purple-600',
    'bg-orange-600',
    'bg-pink-600',
  ];
  const index = hashCode(participantId || 'unknown') % colors.length;
  return colors[index];
}

export function SubtitleEntry({ subtitle, isSpeaking }: SubtitleEntryProps) {
  const speakerName = subtitle.participantName || 'Unknown';
  const participantId = subtitle.participantId || 'unknown';
  const colorClass = getSpeakerColor(participantId);

  return (
    <div className="mb-4 pb-4 border-b border-gray-200 last:border-b-0">
      {/* Speaker Name + Color Indicator + Speaking Indicator */}
      <div className="flex items-center gap-2 mb-2" aria-label={`Speaker: ${speakerName}`}>
        {/* Color dot for speaker identification */}
        <div className={`w-3 h-3 rounded-full ${colorClass}`} aria-hidden="true" />

        <span className="font-semibold text-sm text-gray-800">
          {speakerName}
        </span>

        {/* Speaking indicator (appears when participant is speaking) */}
        {isSpeaking && (
          <span className="text-gray-500 text-xs animate-pulse" aria-label="Speaking">
            ...
          </span>
        )}
      </div>

      {/* Original Text */}
      {subtitle.originalText && (
        <div className="mb-2">
          <span className="text-xs text-gray-500 uppercase font-medium">
            Original
          </span>
          <p className="text-sm text-gray-900 leading-relaxed mt-1">
            {subtitle.originalText}
          </p>
        </div>
      )}

      {/* Translated Text */}
      {subtitle.translatedText && (
        <div>
          <span className="text-xs text-blue-600 uppercase font-medium">
            Translation
          </span>
          <p className="text-sm text-blue-900 font-medium leading-relaxed mt-1">
            {subtitle.translatedText}
          </p>
        </div>
      )}
    </div>
  );
}
