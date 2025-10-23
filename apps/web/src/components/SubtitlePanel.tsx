/**
 * SubtitlePanel Component
 * Real-time subtitle display panel with auto-scroll functionality
 */

import { useEffect, useRef, useState } from 'react';
import { TranslationSegment } from '@/hooks/useTranslation';
import { SubtitleEntry, getSpeakerColor } from './SubtitleEntry';

interface SubtitlePanelProps {
  translations: TranslationSegment[];
  speakingParticipants: Set<string>;
  isVisible: boolean;
  // ✅ FIX #2: Add participantData to resolve names for speaking indicators
  participantData: Map<string, { identity: string }>;
}

export function SubtitlePanel({
  translations,
  speakingParticipants,
  isVisible,
  participantData,
}: SubtitlePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to latest subtitle when new translations arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [translations, speakingParticipants, autoScroll]); // Add speakingParticipants to trigger scroll for new indicators

  // Detect user scroll - pause auto-scroll if user scrolls up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10; // 10px threshold

    setAutoScroll(isAtBottom); // Resume auto-scroll if user scrolls to bottom
  };

  // Scroll to bottom button handler
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  if (!isVisible) {
    return null;
  }

  // Limit to last 50 translations for performance
  const recentTranslations = translations.slice(-50);

  return (
    <div className="fixed bottom-0 right-0 w-full lg:w-96 h-80 lg:h-96 bg-white border-l border-t border-gray-300 shadow-2xl z-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-900">
            Live Subtitles
          </h3>
          <span className="text-xs text-gray-500">
            {recentTranslations.length} {recentTranslations.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Subtitle Scroll Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 pt-3" // Use pt-3 instead of py-3
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions"
          aria-label="Live subtitles"
        >
          {recentTranslations.length === 0 &&
          speakingParticipants.size === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Waiting for conversation...
            </p>
          ) : (
            recentTranslations.map((translation, index) => {
              // ✅ FIX #2: Do not show speaking indicator on historical entries
              return (
                <SubtitleEntry
                  // ✅ FIX #4: Add participantId to prevent key collisions
                  key={`${translation.timestamp}-${translation.participantId}-${index}`}
                  subtitle={translation}
                  isSpeaking={false}
                />
              );
            })
          )}
        </div>

        {/* ✅ FIX #2: Separate section for currently speaking participants */}
        {speakingParticipants.size > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            {Array.from(speakingParticipants).map((sid) => {
              const name = participantData.get(sid)?.identity || 'Someone';
              const colorClass = getSpeakerColor(sid);
              return (
                <div
                  key={sid}
                  className="flex items-center gap-2 py-1"
                  aria-label={`${name} is speaking`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${colorClass}`}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-sm text-gray-800">
                    {name}
                  </span>
                  <span
                    className="text-gray-500 text-xs animate-pulse"
                    aria-label="Speaking"
                  >
                    ...
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Scroll to Bottom Button (appears when not at bottom) */}
        {!autoScroll && (
          <div className="absolute bottom-4 right-4">
            <button
              onClick={scrollToBottom}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Scroll to latest subtitle"
            >
              ↓ Latest
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
