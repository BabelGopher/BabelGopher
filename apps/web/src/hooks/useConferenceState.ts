import { useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Participant, Subtitle } from '../types/conference';

/**
 * Convenience hook for accessing conference state and actions
 * Provides typed access to conference-specific state and dispatch methods
 */
export function useConferenceState() {
  const { state, dispatch } = useAppContext();

  // Memoize conference state to prevent unnecessary re-renders
  const conference = useMemo(() => state.conference, [state.conference]);

  // Conference room actions
  const joinConference = useCallback(
    (roomName: string) => {
      dispatch({ type: 'CONFERENCE_JOIN', payload: { roomName } });
    },
    [dispatch]
  );

  const leaveConference = useCallback(() => {
    dispatch({ type: 'CONFERENCE_LEAVE' });
  }, [dispatch]);

  const setConnecting = useCallback(
    (isConnecting: boolean) => {
      dispatch({ type: 'CONFERENCE_CONNECTING', payload: isConnecting });
    },
    [dispatch]
  );

  const setConnected = useCallback(
    (isConnected: boolean) => {
      dispatch({ type: 'CONFERENCE_CONNECTED', payload: isConnected });
    },
    [dispatch]
  );

  // Participant actions
  const addParticipant = useCallback(
    (participant: Participant) => {
      dispatch({ type: 'PARTICIPANT_ADD', payload: participant });
    },
    [dispatch]
  );

  const removeParticipant = useCallback(
    (participantId: string) => {
      dispatch({ type: 'PARTICIPANT_REMOVE', payload: participantId });
    },
    [dispatch]
  );

  const updateParticipant = useCallback(
    (participant: Participant) => {
      dispatch({ type: 'PARTICIPANT_UPDATE', payload: participant });
    },
    [dispatch]
  );

  const setParticipants = useCallback(
    (participants: Participant[]) => {
      dispatch({ type: 'PARTICIPANTS_SET', payload: participants });
    },
    [dispatch]
  );

  const setParticipantSpeaking = useCallback(
    (participantId: string) => {
      dispatch({ type: 'PARTICIPANT_SPEAKING', payload: participantId });
    },
    [dispatch]
  );

  // Subtitle actions
  const addSubtitle = useCallback(
    (subtitle: Subtitle) => {
      dispatch({ type: 'SUBTITLE_ADD', payload: subtitle });
    },
    [dispatch]
  );

  const setSubtitles = useCallback(
    (subtitles: Subtitle[]) => {
      dispatch({ type: 'SUBTITLES_SET', payload: subtitles });
    },
    [dispatch]
  );

  const clearSubtitles = useCallback(() => {
    dispatch({ type: 'SUBTITLES_CLEAR' });
  }, [dispatch]);

  // Computed values
  const localParticipant = useMemo(
    () => conference.participants.find((p) => p.isSelf),
    [conference.participants]
  );

  const remoteParticipants = useMemo(
    () => conference.participants.filter((p) => !p.isSelf),
    [conference.participants]
  );

  const isMuted = useMemo(
    () => localParticipant?.isMuted ?? false,
    [localParticipant]
  );

  return {
    // State
    roomName: conference.roomName,
    participants: conference.participants,
    subtitles: conference.subtitles,
    isConnecting: conference.isConnecting,
    isConnected: conference.isConnected,
    localParticipant,
    remoteParticipants,
    isMuted,

    // Actions
    joinConference,
    leaveConference,
    setConnecting,
    setConnected,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setParticipants,
    setParticipantSpeaking,
    addSubtitle,
    setSubtitles,
    clearSubtitles,
  };
}
