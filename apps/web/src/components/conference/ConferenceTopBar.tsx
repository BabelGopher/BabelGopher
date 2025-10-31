import React from 'react';
import { Button } from '../ui';

interface ConferenceTopBarProps {
  roomName: string;
  onExit: () => void;
}

export function ConferenceTopBar({ roomName, onExit }: ConferenceTopBarProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          🏠
        </span>
        <h1 className="font-heading text-2xl text-white truncate">{roomName}</h1>
      </div>

      <Button variant="danger" size="sm" onClick={onExit} aria-label="Exit conference">
        ❌ Exit
      </Button>
    </header>
  );
}
