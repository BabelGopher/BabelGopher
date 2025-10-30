import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ConferenceTopBar } from "../../components/conference/ConferenceTopBar";
import { ConferenceMainContent } from "../../components/conference/ConferenceMainContent";
import { ConferenceControlBar } from "../../components/conference/ConferenceControlBar";
import { SettingsModal } from "../../components/conference/SettingsModal";
import { ExitConfirmModal } from "../../components/conference/ExitConfirmModal";
import { Spinner } from "../../components/ui";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { useConferenceOrchestrator } from "../../hooks/useConferenceOrchestrator";
import { useSettings } from "../../hooks/useSettings";
import { useModals } from "../../hooks/useModals";
import { useToasts } from "../../hooks/useToasts";
import { LanguageSelector } from "../../components/LanguageSelector";
import { TTSService } from "../../lib/tts";

function ConferenceRoomContent() {
  const router = useRouter();
  const { roomName, name, lang } = router.query;

  const { showWarning } = useToasts();
  const { isSubtitleEnabled, selectedLanguage, toggleSubtitle, setLanguage } =
    useSettings();

  const {
    isSettingsOpen,
    isExitConfirmOpen,
    openSettings,
    closeSettings,
    openExitConfirm,
    closeExitConfirm,
  } = useModals();

  // Track if transcription has been started
  const [hasStartedTranscription, setHasStartedTranscription] = useState(false);
  // Ensure auto-start runs at most once per mount
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);
  // Pre-join modal state
  const [showPrejoin, setShowPrejoin] = useState<boolean>(false);
  const [prejoinLang, setPrejoinLang] = useState<string>("en");

  // Initialize pre-join visibility once per session and default language
  useEffect(() => {
    try {
      const seen = sessionStorage.getItem("bg:prejoin");
      setShowPrejoin(!seen);
    } catch {
      setShowPrejoin(true);
    }
  }, []);

  useEffect(() => {
    // Sync default selection from settings
    setPrejoinLang(selectedLanguage);
  }, [selectedLanguage]);

  // Use the master orchestrator hook
  const {
    isConnecting,
    isConnected,
    participants,
    subtitles,
    isMuted,
    toggleMute,
    setMicrophoneDevice,
    disconnect,
    isTranscribing,
    startTranscription,
    stopTranscription,
    isTtsEnabled,
    toggleTTS,
    capabilities,
    canStartSTT,
    translationDownload,
    reconnect,
    startAudio,
  } = useConferenceOrchestrator({
    roomName: (roomName as string) || "default-room",
    participantName: (name as string) || "Anonymous",
    targetLanguage: selectedLanguage || (lang as string) || "en",
  });

  // Auto-start transcription at most once per mount when ready
  useEffect(() => {
    if (!autoStartAttempted && canStartSTT) {
      console.log("[Conference] Auto-starting transcription...");
      setAutoStartAttempted(true);
      startTranscription();
    }
  }, [canStartSTT, autoStartAttempted, startTranscription]);

  // Mark as started only after transcription actually begins
  useEffect(() => {
    if (isTranscribing && !hasStartedTranscription) {
      setHasStartedTranscription(true);
    }
  }, [isTranscribing, hasStartedTranscription]);

  // Show capability warnings on mount
  useEffect(() => {
    if (!isConnecting) {
      if (!capabilities.sttAvailable) {
        showWarning(
          "Speech recognition not available. Please use Chrome/Edge browser."
        );
      }

      if (!capabilities.translationAvailable) {
        showWarning(
          "Translation API not available. Enable Chrome AI features."
        );
      }

      if (!capabilities.ttsAvailable) {
        showWarning("Text-to-speech not available in this browser.");
      }
    }
  }, [isConnecting, capabilities, showWarning]);

  // Handlers
  const handleExit = () => {
    openExitConfirm();
  };

  const handleConfirmExit = async () => {
    closeExitConfirm();
    await disconnect();
    router.push("/");
  };

  const handleToggleTts = () => {
    toggleTTS();
  };

  const handleToggleSubtitle = () => {
    toggleSubtitle();
  };

  const handleSelectLanguage = (lang: string) => {
    setLanguage(lang);
  };

  const handleOpenSettings = () => {
    openSettings();
  };

  const handleToggleMute = () => {
    toggleMute();
  };

  const handleToggleTranscription = () => {
    if (!isConnected) {
      showWarning("아직 회의실에 연결되지 않았어요. 연결 후 다시 시도해 주세요.");
      return;
    }
    if (isTranscribing) {
      stopTranscription();
      setHasStartedTranscription(false);
    } else {
      startTranscription();
    }
  };

  // Loading state
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-white text-lg mt-4">Connecting to {roomName}...</p>
          <p className="text-gray-400 text-sm mt-2">
            Initializing WebRTC and AI services...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Pre-join Modal: Language selection + Audio unlock */}
      {showPrejoin && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">회의 시작 전에 설정을 완료해 주세요</h2>
            <div className="mb-4">
              <LanguageSelector
                selectedLanguage={prejoinLang}
                onChange={(code) => setPrejoinLang(code)}
              />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={async () => {
                  try {
                    // Unlock TTS & audio autoplay
                    if (typeof window !== "undefined" && window.speechSynthesis) {
                      try { window.speechSynthesis.resume(); } catch {}
                    }
                    try { await TTSService.initialize(); } catch {}
                    // Apply language
                    setLanguage(prejoinLang);
                    // Persist prejoin completion for this tab session
                    try { sessionStorage.setItem("bg:prejoin", "1"); } catch {}
                    setShowPrejoin(false);
                    // Attempt to start audio playout if room already exists
                    try { await startAudio(); } catch {}
                  } catch {}
                }}
                className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                오디오 활성화하고 시작하기
              </button>
            </div>
          </div>
        </div>
      )}
      <ConferenceTopBar roomName={roomName as string} onExit={handleExit} />

      <ConferenceMainContent
        participants={participants}
        subtitles={subtitles}
        isSubtitleEnabled={isSubtitleEnabled}
      />

      <ConferenceControlBar
        isTtsEnabled={isTtsEnabled}
        onToggleTts={handleToggleTts}
        isSubtitleEnabled={isSubtitleEnabled}
        onToggleSubtitle={handleToggleSubtitle}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
        onOpenSettings={handleOpenSettings}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Translation Model Download Overlay */}
      {translationDownload?.inProgress && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg w-80 text-center pointer-events-auto">
            <p className="mb-3 text-sm">Preparing translation model...</p>
            <div className="w-full bg-gray-700 rounded h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 transition-all"
                style={{ width: `${translationDownload.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-300">
              {translationDownload.progress}%
            </p>
          </div>
        </div>
      )}

      {/* Transcription Status Indicator (Debug) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute bottom-20 right-4 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isTranscribing ? "bg-green-500 animate-pulse" : "bg-gray-500"
              }`}
            />
            <span>{isTranscribing ? "Listening..." : "Not listening"}</span>
          </div>
          <button
            onClick={handleToggleTranscription}
            disabled={!isConnected}
            className={`mt-2 text-xs px-2 py-1 rounded ${
              isConnected
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            {isTranscribing ? "Stop STT" : "Start STT"}
          </button>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        onMicrophoneChange={(deviceId) => {
          if (isConnected) {
            setMicrophoneDevice(deviceId);
          }
        }}
      />

      {/* Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitConfirmOpen}
        onClose={closeExitConfirm}
        onConfirm={handleConfirmExit}
      />

      {/* Disconnected Retry Banner */}
      {!isConnected && !isConnecting && (
        <div className="absolute bottom-24 right-4 bg-yellow-500 text-black text-sm px-3 py-2 rounded shadow-lg flex items-center gap-3">
          <span>연결이 원활하지 않아요.</span>
          <button
            onClick={() => reconnect()}
            className="bg-black/20 hover:bg-black/30 text-black font-semibold px-2 py-1 rounded"
          >
            재시도
          </button>
        </div>
      )}
    </div>
  );
}

// Wrap the entire component with ErrorBoundary
export default function ConferenceRoom() {
  return (
    <ErrorBoundary>
      <ConferenceRoomContent />
    </ErrorBoundary>
  );
}
