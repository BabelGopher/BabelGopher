import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Mic, Volume2 } from 'lucide-react';
import { FR, TH, NL, KR, AL, US } from 'country-flag-icons/react/3x2';
import { Circle, Triangle, Square } from '../components/shapes';
import { SpeechBubble } from '../components/landing/SpeechBubble';
import { MicrophoneSettingsModal } from '../components/audio/MicrophoneSettingsModal';
import { SpeakerSettingsModal } from '../components/audio/SpeakerSettingsModal';
import { BrowserWarning } from '../components/BrowserWarning';
import { Input, Button } from '../components/ui';
import {
  getLanguage,
  saveLanguage,
  getMicDevice,
  saveMicDevice,
  getSpeakerDevice,
  saveSpeakerDevice,
  getSpeakerVolume,
  saveSpeakerVolume,
} from '../utils/storageUtils';

const LANGUAGE_FLAGS = [
  { code: 'en', name: 'English', flag: US },
  { code: 'fr', name: 'French', flag: FR },
  { code: 'th', name: 'Thai', flag: TH },
  { code: 'nl', name: 'Dutch', flag: NL },
  { code: 'kr', name: 'Korean', flag: KR },
  { code: 'al', name: 'Albanian', flag: AL },
];

export default function LobbyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '', roomCode: '', language: '' });

  // Audio settings state - initialized from localStorage
  const [showMicSettings, setShowMicSettings] = useState(false);
  const [selectedMic, setSelectedMic] = useState('default');
  const [showSpeakerSettings, setShowSpeakerSettings] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState('default');
  const [speakerVolume, setSpeakerVolume] = useState(80);

  // Load preferences from localStorage on mount
  useEffect(() => {
    setSelectedLanguage(getLanguage('en'));
    setSelectedMic(getMicDevice('default'));
    setSelectedSpeaker(getSpeakerDevice('default'));
    setSpeakerVolume(getSpeakerVolume(80));
  }, []);

  // Save language preference when it changes
  useEffect(() => {
    saveLanguage(selectedLanguage);
  }, [selectedLanguage]);

  // Save mic device preference when it changes
  useEffect(() => {
    saveMicDevice(selectedMic);
  }, [selectedMic]);

  // Save speaker device preference when it changes
  useEffect(() => {
    saveSpeakerDevice(selectedSpeaker);
  }, [selectedSpeaker]);

  // Save speaker volume preference when it changes
  useEffect(() => {
    saveSpeakerVolume(speakerVolume);
  }, [speakerVolume]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors = { name: '', roomCode: '', language: '' };
    let hasErrors = false;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      hasErrors = true;
    }

    if (!roomCode.trim()) {
      newErrors.roomCode = 'Room code is required';
      hasErrors = true;
    }

    if (!selectedLanguage) {
      newErrors.language = 'Please select a language';
      hasErrors = true;
    }

    setErrors(newErrors);

    if (hasErrors) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      router.push(`/room/${roomCode}?name=${encodeURIComponent(name)}&lang=${selectedLanguage}`);
    }, 1000);
  };

  return (
    <>
      <BrowserWarning />
      <main className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-orange-100 via-pink-100 to-rose-200 md:bg-gradient-to-br md:from-purple-400 md:via-pink-300 md:to-blue-300">
      {/* Background Image - Tower of Babel - Hidden on mobile */}
      <div
        className="hidden md:block absolute inset-0 w-full h-full bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/babel-tower-bg.jpg)',
        }}
      />

      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        <Triangle className="absolute top-[10%] right-[15%] w-4 h-4 md:w-6 md:h-6 text-blue-500 animate-float-slow hidden md:block" />
        <Circle className="absolute top-[5%] left-[5%] w-8 h-8 md:w-12 md:h-12 text-purple-400 opacity-60 hidden lg:block" />
        <Square className="absolute top-[35%] left-[8%] w-6 h-6 md:w-8 md:h-8 text-yellow-400 rotate-45 animate-float-reverse hidden md:block" />
        <Triangle className="absolute top-[40%] left-[12%] w-6 h-6 md:w-8 md:h-8 text-blue-400 rotate-180 animate-float-fast hidden lg:block" />
        <div className="absolute top-[45%] right-[10%] w-2 h-2 md:w-3 md:h-3 rounded-full bg-pink-400 hidden md:block" />
        <div className="absolute bottom-[20%] left-[3%] w-10 h-10 md:w-16 md:h-16 hidden lg:block" style={{background: 'conic-gradient(from 45deg, #ff0080, #ffff00, #ff0080)', borderRadius: '50%'}} />
        <Triangle className="absolute bottom-[15%] left-[8%] w-4 h-4 md:w-6 md:h-6 text-orange-400 animate-float hidden md:block" />
        <Square className="absolute bottom-[25%] right-[5%] w-6 h-6 md:w-10 md:h-10 text-pink-400 rotate-12 hidden lg:block" />
        <div className="absolute bottom-[10%] right-[12%] w-3 h-3 md:w-5 md:h-5 rounded-full bg-orange-400 animate-float-slow hidden md:block" />
      </div>

      {/* Top Navigation Bar */}
      <nav className="relative z-20 flex items-center px-4 md:px-8 py-3 md:py-4 bg-gradient-to-b from-orange-50/80 to-transparent md:from-blue-500/90 md:to-blue-500/70 backdrop-blur-md md:backdrop-blur-sm">
        <h1 className="font-display text-xl md:text-2xl lg:text-3xl text-rose-800 md:text-white">BabelGopher</h1>
      </nav>

      {/* Main Content Area */}
      <div className="relative z-10 h-full flex flex-col items-center justify-end pb-8 md:justify-start md:pb-0">

        {/* Mobile Background Gopher - Hero element */}
        <div className="md:hidden absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          <img
            src="/images/babel-gopher-hero.png"
            alt=""
            className="w-full max-w-lg opacity-55"
            style={{ transform: 'translateY(-25%)' }}
          />
        </div>

        {/* Speech Bubbles Container - Hidden on mobile */}
        <div className="hidden md:block relative w-full h-[50vh]">
          {/* Speech Bubbles positioned around Gopher */}
          <div className="absolute top-[18%] left-[32%] z-30 animate-float" style={{ animationDelay: '0s' }}>
            <SpeechBubble
              bgColor="#86E37D"
              textColor="#000000"
              tailDirection="bottom-right"
              className="text-sm md:text-base w-fit"
            >
              Hello
            </SpeechBubble>
          </div>

          <div className="absolute top-[15%] right-[30%] z-30 animate-float-slow" style={{ animationDelay: '1s' }}>
            <SpeechBubble
              bgColor="#FFA860"
              textColor="#FFFFFF"
              tailDirection="bottom-left"
              className="text-sm md:text-base w-fit"
            >
              你好
            </SpeechBubble>
          </div>

          <div className="absolute top-[42%] right-[24%] z-30 animate-float-fast" style={{ animationDelay: '0.5s' }}>
            <SpeechBubble
              bgColor="#6EE7B7"
              textColor="#000000"
              tailDirection="bottom-left"
              className="text-sm md:text-base w-fit"
            >
              안녕
            </SpeechBubble>
          </div>

          <div className="absolute top-[38%] left-[27%] z-30 animate-float-reverse" style={{ animationDelay: '2s' }}>
            <SpeechBubble
              bgColor="#F472B6"
              textColor="#FFFFFF"
              tailDirection="top-right"
              className="text-sm md:text-base w-fit"
            >
              Hola
            </SpeechBubble>
          </div>

          <div className="absolute top-[62%] left-[34%] z-30 animate-float" style={{ animationDelay: '1.5s' }}>
            <SpeechBubble
              bgColor="#FCD34D"
              textColor="#000000"
              tailDirection="top-right"
              className="text-sm md:text-base w-fit"
            >
              こんにちは
            </SpeechBubble>
          </div>

          <div className="absolute top-[60%] right-[27%] z-30 animate-float-slow" style={{ animationDelay: '2.5s' }}>
            <SpeechBubble
              bgColor="#A78BFA"
              textColor="#FFFFFF"
              tailDirection="top-left"
              className="text-sm md:text-base w-fit"
            >
              Bonjour
            </SpeechBubble>
          </div>
        </div>

        {/* Form Card and Mic Buttons Container */}
        <div className="relative w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-4 md:gap-8 px-4 mb-8 md:mt-8 md:mb-0">

          {/* Mobile Audio Buttons - Shown only on mobile, above the form */}
          <div className="relative z-20 flex lg:hidden items-center justify-center gap-4 order-1">
            <button
              type="button"
              onClick={() => setShowMicSettings(true)}
              aria-label="Open microphone settings"
              className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 border-3 border-orange-200 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Mic size={24} className="text-white" />
            </button>
            <button
              type="button"
              onClick={() => setShowSpeakerSettings(true)}
              aria-label="Open speaker settings"
              className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-300 to-teal-400 border-3 border-teal-200 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Volume2 size={24} className="text-white" />
            </button>
          </div>

          {/* Left Mic Button - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex flex-col items-center gap-3 order-2">
            <button
              type="button"
              onClick={() => setShowMicSettings(true)}
              aria-label="Open microphone settings"
              className="w-20 h-20 xl:w-24 xl:h-24 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 border-4 border-orange-200 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Mic size={32} className="xl:w-9 xl:h-9 text-white" />
            </button>
            <span className="text-white font-semibold text-xs xl:text-sm drop-shadow-lg text-center">Microphone<br/>Settings</span>
          </div>

          {/* Form Card */}
          <div className="relative z-20 w-full max-w-md lg:w-[450px] bg-white/85 md:bg-blue-500 backdrop-blur-md md:backdrop-blur-none rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl order-2 lg:order-3">
            <form onSubmit={handleJoin} className="space-y-4 md:space-y-5">

              {/* Your Name Input */}
              <Input
                id="name"
                label="Your Name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="John Doe"
                error={errors.name}
                required
              />

              {/* Room Code Input */}
              <Input
                id="roomCode"
                label="Room Code"
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value);
                  if (errors.roomCode) setErrors({ ...errors, roomCode: '' });
                }}
                placeholder="abc123"
                error={errors.roomCode}
                required
              />

              {/* Language Selector with Flags */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-900 md:text-white mb-1.5">
                  Output Language
                </label>
                <div className="relative">
                  <select
                    id="language"
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      if (errors.language) setErrors({ ...errors, language: '' });
                    }}
                    className="w-full px-4 py-3 md:px-5 md:py-4 rounded-xl bg-white text-gray-700 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-300 cursor-pointer text-base md:text-lg pr-12"
                  >
                    <option value="">I want to hear in:</option>
                    {LANGUAGE_FLAGS.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  {/* Flag Icons Display */}
                  <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
                    {LANGUAGE_FLAGS.map((lang) => {
                      const FlagComponent = lang.flag;
                      return (
                        <FlagComponent key={lang.code} className="w-4 h-3 md:w-5 md:h-4 rounded-sm" />
                      );
                    })}
                  </div>
                </div>
                {errors.language && (
                  <p className="mt-1 text-sm text-red-600 md:text-red-200">{errors.language}</p>
                )}
              </div>

              {/* Join Conference Button */}
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 py-3 md:py-4 rounded-full text-lg md:text-xl shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? 'Connecting...' : 'Join Conference'}
              </Button>
            </form>
          </div>

          {/* Right Speaker Button - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex flex-col items-center gap-3 order-4">
            <button
              type="button"
              onClick={() => setShowSpeakerSettings(true)}
              aria-label="Open speaker settings"
              className="w-20 h-20 xl:w-24 xl:h-24 rounded-full bg-gradient-to-br from-teal-300 to-teal-400 border-4 border-teal-200 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Volume2 size={32} className="xl:w-9 xl:h-9 text-white" />
            </button>
            <span className="text-white font-semibold text-xs xl:text-sm drop-shadow-lg text-center">Speaker<br/>Settings</span>
          </div>
        </div>

      </div>

      {/* Audio Settings Modals */}
      <MicrophoneSettingsModal
        isOpen={showMicSettings}
        onClose={() => setShowMicSettings(false)}
        selectedMic={selectedMic}
        onMicSelect={setSelectedMic}
      />
      <SpeakerSettingsModal
        isOpen={showSpeakerSettings}
        onClose={() => setShowSpeakerSettings(false)}
        selectedSpeaker={selectedSpeaker}
        onSpeakerSelect={setSelectedSpeaker}
        volume={speakerVolume}
        onVolumeChange={setSpeakerVolume}
      />
      </main>
    </>
  );
}
