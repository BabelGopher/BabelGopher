import { useState, useEffect, useCallback } from 'react';
import { Room, RoomEvent } from 'livekit-client';

export interface UseLiveKitResult {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connect: (token: string, url: string) => Promise<void>;
  disconnect: () => void;
}

/**
 * Custom React hook for managing LiveKit room connection
 * Handles connection state, errors, and cleanup
 */
export function useLiveKit(): UseLiveKitResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  /**
   * Connect to a LiveKit room
   * @param token - JWT token from backend
   * @param url - LiveKit server WebSocket URL
   */
  const connect = useCallback(async (token: string, url: string) => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Create new room instance
      const newRoom = new Room();

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room');
        setIsConnected(true);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
        setIsConnected(false);
      });

      newRoom.on(RoomEvent.Reconnecting, () => {
        console.log('Reconnecting to LiveKit room...');
      });

      newRoom.on(RoomEvent.Reconnected, () => {
        console.log('Reconnected to LiveKit room');
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity);
      });

      // Connect to room
      await newRoom.connect(url, token);

      // Enable local microphone with echo cancellation and audio enhancements
      await newRoom.localParticipant.setMicrophoneEnabled(true, {
        // Enable echo cancellation to prevent TTS playback from being captured by microphone
        echoCancellation: true,
        // Enable noise suppression for cleaner audio
        noiseSuppression: true,
        // Enable automatic gain control for consistent volume
        autoGainControl: true,
      });

      console.log('[LiveKit] Enabled microphone with echo cancellation and audio enhancements');

      setRoom(newRoom);
    } catch (error) {
      console.error('Failed to connect to LiveKit room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Disconnect from the LiveKit room
   */
  const disconnect = useCallback(() => {
    if (room) {
      console.log('Disconnecting from room...');
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setConnectionError(null);
    }
  }, [room]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  return {
    room,
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
  };
}
