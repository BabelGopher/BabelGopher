import React, { useState } from 'react';
import { Participant, Subtitle } from '../../types/conference';
import { ParticipantPanel } from './ParticipantPanel';
import { SubtitlePanel } from './SubtitlePanel';
import { Button } from '../ui';

interface ConferenceMainContentProps {
  participants: Participant[];
  subtitles: Subtitle[];
  isSubtitleEnabled: boolean;
}

export function ConferenceMainContent({
  participants,
  subtitles,
  isSubtitleEnabled,
}: ConferenceMainContentProps) {
  const [isParticipantsPanelOpen, setIsParticipantsPanelOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
      {/* Participants Panel */}
      <aside
        className={`
          md:w-[300px] md:flex-shrink-0 md:block
          ${isParticipantsPanelOpen ? 'fixed inset-0 z-20' : 'hidden'}
          bg-gray-800 p-4 overflow-y-auto
          md:border-r md:border-gray-700
        `}
        aria-label="Conference Participants"
      >
        {/* Mobile Close Button */}
        <div className="md:hidden flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Participants</h2>
          <Button
            variant="icon"
            size="sm"
            onClick={() => setIsParticipantsPanelOpen(false)}
            aria-label="Close participants panel"
            className="text-gray-400 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>
        <ParticipantPanel participants={participants} />
      </aside>

      {/* Subtitle Panel */}
      <main className="flex-1 bg-gray-900 p-4 md:p-6 overflow-y-auto relative" aria-label="Conference Subtitles">
        {/* Mobile toggle for participants panel */}
        {!isParticipantsPanelOpen && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsParticipantsPanelOpen(true)}
            aria-label="Open participants panel"
            className="md:hidden fixed bottom-24 right-4 z-10 shadow-lg rounded-full w-14 h-14 flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </Button>
        )}
        <SubtitlePanel subtitles={subtitles} isEnabled={isSubtitleEnabled} />
      </main>
    </div>
  );
}
