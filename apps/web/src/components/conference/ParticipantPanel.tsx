import React from 'react';
import { Participant } from '../../types/conference';
import { ParticipantCard } from './ParticipantCard';

interface ParticipantPanelProps {
  participants: Participant[];
}

export function ParticipantPanel({ participants }: ParticipantPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-4 hidden md:block">
        👥 Participants ({participants.length})
      </h2>
      <div className="flex-1 overflow-y-auto" role="list" aria-label="Conference participants">
        {participants.map((participant) => (
          <ParticipantCard key={participant.id} participant={participant} />
        ))}
      </div>
    </div>
  );
}
