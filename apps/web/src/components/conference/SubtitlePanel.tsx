import React, { useEffect, useRef } from 'react';
import { Subtitle } from '../../types/conference';
import { SubtitleEntry } from './SubtitleEntry';

interface SubtitlePanelProps {
  subtitles: Subtitle[];
  isEnabled?: boolean;
}

export function SubtitlePanel({ subtitles, isEnabled = true }: SubtitlePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new subtitle arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subtitles]);

  if (!isEnabled) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Subtitles are turned off</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="font-heading text-xl text-white mb-4 hidden md:block">
        📝 Live Subtitles
      </h2>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-label="Live subtitle feed"
      >
        {subtitles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Waiting for speech...</p>
          </div>
        ) : (
          subtitles.map((subtitle) => (
            <SubtitleEntry key={subtitle.id} subtitle={subtitle} />
          ))
        )}
      </div>
    </div>
  );
}
