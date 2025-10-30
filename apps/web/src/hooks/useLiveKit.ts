import { useState, useEffect, useCallback, useRef } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  LocalTrackPublication,
  ParticipantEvent,
  ConnectionState,
  createLocalAudioTrack,
} from "livekit-client";
import { createComponentLogger } from "../lib/logger";

const log = createComponentLogger("LiveKit");

interface UseLiveKitOptions {
  roomName: string;
  participantName: string;
  onError?: (error: Error) => void;
}

export interface LiveKitParticipant {
  sid: string;
  identity: string;
  name: string;
  isSpeaking: boolean;
  isSelf: boolean;
  isMuted: boolean;
  audioTrack: RemoteTrack | null;
}

export function useLiveKit({
  roomName,
  participantName,
  onError,
}: UseLiveKitOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<LiveKitParticipant[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<LocalTrackPublication | null>(null);

  const roomRef = useRef<Room | null>(null);

  // Convert LiveKit participant to app participant format
  const convertParticipant = useCallback(
    (
      participant: RemoteParticipant | LocalParticipant,
      isSelf: boolean
    ): LiveKitParticipant => {
      const audioPublication = Array.from(
        participant.audioTrackPublications.values() as Iterable<
          RemoteTrackPublication | LocalTrackPublication
        >
      )[0];
      const audioTrack = audioPublication?.track || null;
      const isMuted = audioPublication?.isMuted ?? true;

      return {
        sid: participant.sid,
        identity: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        isSelf,
        isMuted,
        audioTrack: audioTrack as RemoteTrack | null,
      };
    },
    []
  );

  // Update participants list
  const updateParticipants = useCallback(() => {
    if (!roomRef.current) return;

    const allParticipants: LiveKitParticipant[] = [];

    // Add local participant
    if (roomRef.current.localParticipant) {
      allParticipants.push(
        convertParticipant(roomRef.current.localParticipant, true)
      );
    }

    // Add remote participants
    roomRef.current.remoteParticipants.forEach((participant) => {
      allParticipants.push(convertParticipant(participant, false));
    });

    setParticipants(allParticipants);
  }, [convertParticipant]);

  // Connect to LiveKit room with retry logic
  const connect = useCallback(
    async (retryCount: number = 0) => {
      if (roomRef.current || isConnecting) {
        log.warn("Already connected or connecting, skipping connect");
        return;
      }

      setIsConnecting(true);

      const maxRetries = 3;
      const retryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

      try {
        // Fetch access token (env-gated branch)
        const useServerToken =
          process.env.NEXT_PUBLIC_USE_SERVER_TOKEN === "true";
        let response: Response;
        // 12s timeout for token fetch
        const tokenTimeoutMs = 12000;
        const tokenAbort = new AbortController();
        const tokenTimer = setTimeout(() => tokenAbort.abort(), tokenTimeoutMs);
        if (useServerToken) {
          const base = process.env.NEXT_PUBLIC_SERVER_BASE_URL || "";
          response = await fetch(`${base}/auth-livekit-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room_name: roomName,
              user_identity: participantName,
            }),
            signal: tokenAbort.signal,
          });
        } else {
          response = await fetch(
            `/api/livekit/token?roomName=${encodeURIComponent(
              roomName
            )}&participantName=${encodeURIComponent(participantName)}`,
            { signal: tokenAbort.signal }
          );
        }
        clearTimeout(tokenTimer);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(
              "Rate limit exceeded. Please wait a minute and try again."
            );
          }
          throw new Error(`Failed to get access token (${response.status})`);
        }

        const payload = await response.json();
        const token = payload.token as string;
        const url = payload.url as string;

        if (!token || !url) {
          throw new Error("Invalid token response");
        }

        // Create room instance
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = newRoom;
        setRoom(newRoom);

        // Set up event listeners
        newRoom.on(
          RoomEvent.ConnectionStateChanged,
          (state: ConnectionState) => {
            log.info("Connection state changed", { state });
            setConnectionState(state);
          }
        );

        newRoom.on(
          RoomEvent.ParticipantConnected,
          (participant: RemoteParticipant) => {
            log.info("Participant connected", {
              identity: participant.identity,
            });
            updateParticipants();

            // Listen to speaking events
            participant.on(ParticipantEvent.IsSpeakingChanged, () => {
              updateParticipants();
            });

            // Listen to track muted/unmuted
            participant.on(ParticipantEvent.TrackMuted, () => {
              updateParticipants();
            });

            participant.on(ParticipantEvent.TrackUnmuted, () => {
              updateParticipants();
            });
          }
        );

        newRoom.on(
          RoomEvent.ParticipantDisconnected,
          (participant: RemoteParticipant) => {
            log.info("Participant disconnected", {
              identity: participant.identity,
            });
            updateParticipants();
          }
        );

        newRoom.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, publication: RemoteTrackPublication) => {
            log.debug("Track subscribed", {
              kind: track.kind,
              trackSid: publication.trackSid,
            });
            updateParticipants();
          }
        );

        newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          log.debug("Track unsubscribed", { kind: track.kind });
          updateParticipants();
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          log.info("Disconnected from room");
          setConnectionState(ConnectionState.Disconnected);
        });

        newRoom.on(RoomEvent.Reconnecting, () => {
          log.info("Reconnecting to room");
          setConnectionState(ConnectionState.Reconnecting);
        });

        // Connect to room with 12s timeout
        const connectTimeoutMs = 12000;
        const connectTimeout = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error("Connection timed out")), connectTimeoutMs);
        });
        await Promise.race([newRoom.connect(url, token), connectTimeout]);
        // Mark connecting complete as soon as the room connection is established
        // so the UI doesn't get stuck if device/audio initialization fails later
        setIsConnecting(false);

        // Attempt to start audio playout (required by autoplay policy on some devices)
        try {
          await newRoom.startAudio();
        } catch {
          log.warn("Audio playout not started (user gesture likely required)");
        }

        // Enable local audio (best-effort)
        try {
          const audioTrack = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });

          const publication = await newRoom.localParticipant.publishTrack(
            audioTrack
          );
          setLocalAudioTrack(publication);
        } catch (deviceError) {
          // Gracefully continue without a published local track; user may enable mic later
          log.error(
            "Failed to initialize microphone track",
            deviceError as Error
          );
        }

        // Listen to local participant events
        newRoom.localParticipant.on(ParticipantEvent.IsSpeakingChanged, () => {
          updateParticipants();
        });

        newRoom.localParticipant.on(ParticipantEvent.TrackMuted, () => {
          updateParticipants();
        });

        newRoom.localParticipant.on(ParticipantEvent.TrackUnmuted, () => {
          updateParticipants();
        });

        updateParticipants();

        log.info("Successfully connected to room", { roomName });
      } catch (error) {
        log.error(
          `Failed to connect to LiveKit (attempt ${retryCount + 1}/${
            maxRetries + 1
          })`,
          error as Error
        );

        // Determine if we should retry
        const shouldRetry = retryCount < maxRetries;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Check if this is a retryable error
        const isRetryableError =
          !errorMessage.includes("Rate limit") &&
          !errorMessage.includes("Invalid token") &&
          !errorMessage.includes("400") &&
          !errorMessage.includes("401") &&
          !errorMessage.includes("403") &&
          !errorMessage.toLowerCase().includes("timed out");

        if (shouldRetry && isRetryableError) {
          const delay = retryDelays[retryCount];
          log.info("Retrying connection", { delayMs: delay });

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Recursive retry
          return connect(retryCount + 1);
        }

        // All retries exhausted or non-retryable error
        setIsConnecting(false);
        // Cleanup any partially established room state
        try {
          if (roomRef.current) {
            await roomRef.current.disconnect();
            roomRef.current = null;
            setRoom(null);
            setParticipants([]);
            setLocalAudioTrack(null);
          }
        } catch {}

        if (onError) {
          const friendlyError = new Error(
            retryCount > 0
              ? `Failed to connect after ${
                  retryCount + 1
                } attempts: ${errorMessage}`
              : errorMessage
          );
          onError(friendlyError);
        }
      }
    },
    [roomName, participantName, updateParticipants, onError, isConnecting]
  );

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setParticipants([]);
      setLocalAudioTrack(null);
    }
  }, []);

  // Toggle microphone mute
  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    try {
      // Ensure audio playout is started (Safari requires user gesture)
      try {
        await room.startAudio();
      } catch {
        // non-fatal
      }

      // Try to find an existing local audio publication if state ref is missing
      let publication = localAudioTrack;
      if (!publication && room.localParticipant) {
        const pubs = Array.from(
          room.localParticipant.audioTrackPublications.values()
        ) as LocalTrackPublication[];
        if (pubs[0]) {
          publication = pubs[0];
          setLocalAudioTrack(publication);
        }
      }

      // If no publication exists, create and publish a new local audio track
      if (!publication) {
        const newTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        publication = await room.localParticipant.publishTrack(newTrack);
        setLocalAudioTrack(publication);
      }

      // Toggle mute state
      const newMutedState = !publication.isMuted;
      if (newMutedState) {
        await publication.mute();
      } else {
        await publication.unmute();
      }

      updateParticipants();
      // Safety: some environments populate localParticipant slightly later
      setTimeout(() => {
        updateParticipants();
      }, 300);
    } catch (e) {
      log.error("Failed to toggle mute", e as Error);
      if (onError) onError(e as Error);
    }
  }, [localAudioTrack, updateParticipants, onError]);

  // Set microphone device
  const setMicrophoneDevice = useCallback(
    async (deviceId: string) => {
      if (!roomRef.current) return;

      try {
        // Create new audio track with selected device
        const newTrack = await createLocalAudioTrack({
          deviceId,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        // Unpublish old track
        if (localAudioTrack) {
          await roomRef.current.localParticipant.unpublishTrack(
            localAudioTrack.track!
          );
        }

        // Publish new track
        const publication = await roomRef.current.localParticipant.publishTrack(
          newTrack
        );
        setLocalAudioTrack(publication);
        updateParticipants();
      } catch (error) {
        log.error("Failed to switch microphone", error as Error);
        if (onError) {
          onError(error as Error);
        }
      }
    },
    [localAudioTrack, updateParticipants, onError]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  // Start audio playout on user gesture (autoplay policy)
  const startPlayout = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.startAudio();
    } catch {}
  }, []);

  return {
    room,
    participants,
    connectionState,
    isConnecting,
    isConnected: connectionState === ConnectionState.Connected,
    isMuted: (() => {
      const currentRoom = roomRef.current;
      if (!currentRoom) return true;
      const pubs = Array.from(
        currentRoom.localParticipant?.audioTrackPublications.values() || []
      ) as LocalTrackPublication[];
      if (pubs[0]) return pubs[0].isMuted;
      return localAudioTrack?.isMuted ?? true;
    })(),
    connect,
    disconnect,
    toggleMute,
    setMicrophoneDevice,
    startPlayout,
  };
}
