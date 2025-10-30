import React from 'react';
import { Participant } from '../../types/conference';

interface ParticipantCardProps {
  participant: Participant;
}

export function ParticipantCard({ participant }: ParticipantCardProps) {
  return (
    <div
      className={`
        relative flex items-center p-3 rounded-lg mb-2 transition-all duration-200
        ${participant.isSelf ? 'bg-blue-700' : 'bg-gray-700'}
        ${
          participant.isSpeaking
            ? 'motion-safe:animate-pulse-speaking motion-reduce:ring-2 motion-reduce:ring-blue-500 motion-reduce:ring-offset-2 motion-reduce:ring-offset-gray-800'
            : ''
        }
      `}
      role="listitem"
      aria-label={`${participant.name}${participant.isSelf ? ' (You)' : ''}${
        participant.isSpeaking ? ', speaking' : ''
      }${participant.isMuted ? ', muted' : ''}`}
    >
      {/* Speaking Indicator (visible when speaking) */}
      {participant.isSpeaking && (
        <div
          className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"
          aria-hidden="true"
        />
      )}

      {/* Avatar/Initial */}
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg
          ${participant.isSelf ? 'bg-blue-500' : 'bg-gray-500'}
          mr-3
        `}
        aria-hidden="true"
      >
        {participant.name.charAt(0).toUpperCase()}
      </div>

      {/* Name and Status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium truncate">{participant.name}</span>
          {participant.isSelf && (
            <span className="px-2 py-0.5 text-xs bg-blue-500 rounded-full text-white font-semibold">
              You
            </span>
          )}
        </div>
        {participant.isMuted && (
          <span className="text-gray-400 text-xs">🔇 Muted</span>
        )}
        {participant.isSpeaking && !participant.isMuted && (
          <span className="text-blue-300 text-xs flex items-center gap-1">
            <span className="animate-blink-1">.</span>
            <span className="animate-blink-2">.</span>
            <span className="animate-blink-3">.</span>
          </span>
        )}
      </div>
    </div>
  );
}
