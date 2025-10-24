import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ConferenceTopBar } from '../../components/conference/ConferenceTopBar';
import { ConferenceMainContent } from '../../components/conference/ConferenceMainContent';
import { ConferenceControlBar } from '../../components/conference/ConferenceControlBar';
import { Participant, Subtitle, ConferenceSettings } from '../../types/conference';
import {
  DUMMY_PARTICIPANTS,
  getInitialDummySubtitles,
  simulateParticipantSpeaking,
  simulateNewSubtitle,
  getRandomParticipant,
  generateDummySubtitle,
  getRandomSpeechSample,
} from '../../lib/dummyData';
import { Spinner } from '../../components/ui';

export default function ConferenceRoom() {
  const router = useRouter();
  const { roomName } = router.query;

  // State management
  const [participants, setParticipants] = useState<Participant[]>(DUMMY_PARTICIPANTS);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [settings, setSettings] = useState<ConferenceSettings>({
    isTtsEnabled: true,
    isSubtitleEnabled: true,
    selectedLanguage: 'ko',
    audioDevices: {
      microphone: 'default',
      speaker: 'default',
    },
  });
  const [isConnecting, setIsConnecting] = useState(true);

  // Simulate connection delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnecting(false);
      setSubtitles(getInitialDummySubtitles());
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Simulate participant speaking changes (every 3 seconds)
  useEffect(() => {
    if (isConnecting) return;

    const interval = setInterval(() => {
      setParticipants((prevParticipants) => {
        const randomParticipant = getRandomParticipant(prevParticipants);
        return simulateParticipantSpeaking(prevParticipants, randomParticipant.id);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnecting]);

  // Simulate new subtitles arriving (every 4-7 seconds, random)
  useEffect(() => {
    if (isConnecting || !settings.isSubtitleEnabled) return;

    const scheduleNextSubtitle = () => {
      const delay = Math.floor(Math.random() * 3000) + 4000; // 4-7 seconds

      return setTimeout(() => {
        setSubtitles((prevSubtitles) => {
          const randomParticipant = getRandomParticipant(participants);
          const { original, translated } = getRandomSpeechSample();
          const newSubtitle = generateDummySubtitle(randomParticipant, original, translated);
          return simulateNewSubtitle(prevSubtitles, newSubtitle);
        });

        // Schedule next subtitle
        timeoutRef.current = scheduleNextSubtitle();
      }, delay);
    };

    const timeoutRef = { current: scheduleNextSubtitle() };

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isConnecting, settings.isSubtitleEnabled, participants]);

  // Handlers
  const handleExit = () => {
    router.push('/');
  };

  const handleToggleTts = () => {
    setSettings((prev) => ({
      ...prev,
      isTtsEnabled: !prev.isTtsEnabled,
    }));
  };

  const handleToggleSubtitle = () => {
    setSettings((prev) => ({
      ...prev,
      isSubtitleEnabled: !prev.isSubtitleEnabled,
    }));
  };

  const handleSelectLanguage = (lang: string) => {
    setSettings((prev) => ({
      ...prev,
      selectedLanguage: lang,
    }));
  };

  const handleOpenSettings = () => {
    // TODO: Implement settings modal
    alert('Settings modal coming soon!');
  };

  const handleToggleMute = () => {
    setParticipants((prevParticipants) =>
      prevParticipants.map((p) =>
        p.isSelf ? { ...p, isMuted: !p.isMuted } : p
      )
    );
  };

  // Get local participant's mute status
  const localParticipant = participants.find((p) => p.isSelf);
  const isMuted = localParticipant?.isMuted ?? false;

  // Loading state
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-white text-lg mt-4">Connecting to {roomName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <ConferenceTopBar roomName={roomName as string} onExit={handleExit} />

      <ConferenceMainContent
        participants={participants}
        subtitles={subtitles}
        isSubtitleEnabled={settings.isSubtitleEnabled}
      />

      <ConferenceControlBar
        isTtsEnabled={settings.isTtsEnabled}
        onToggleTts={handleToggleTts}
        isSubtitleEnabled={settings.isSubtitleEnabled}
        onToggleSubtitle={handleToggleSubtitle}
        selectedLanguage={settings.selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
        onOpenSettings={handleOpenSettings}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    </div>
  );
}
