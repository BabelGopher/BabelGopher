import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Mic, Volume2, User, Menu, X } from 'lucide-react';
import { FR, TH, NL, KR, AL } from 'country-flag-icons/react/3x2';
import { Circle, Triangle, Square } from '../components/shapes';
import { SpeechBubble } from '../components/landing/SpeechBubble';

const LANGUAGE_FLAGS = [
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
  const [selectedLanguage, setSelectedLanguage] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push(`/room/${roomCode || 'demo'}?name=${encodeURIComponent(name || 'Guest')}&lang=${selectedLanguage}`);
    }, 1000);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-purple-400 via-pink-300 to-blue-300">
      {/* Background Image - Tower of Babel */}
      <div
        className="absolute inset-0 w-full h-full bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/babel-tower-bg.jpg)',
        }}
      />

      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
        <Triangle className="absolute top-[10%] right-[15%] w-4 h-4 md:w-6 md:h-6 text-blue-500 animate-float-slow hidden md:block" />
        <Circle className="absolute top-[5%] left-[5%] w-8 h-8 md:w-12 md:h-12 text-purple-400 opacity-60 hidden lg:block" style={{background: 'conic-gradient(from 0deg, #ff0080, #00ffff, #ff0080)'}} />
        <Square className="absolute top-[35%] left-[8%] w-6 h-6 md:w-8 md:h-8 text-yellow-400 rotate-45 animate-float-reverse hidden md:block" />
        <Triangle className="absolute top-[40%] left-[12%] w-6 h-6 md:w-8 md:h-8 text-blue-400 rotate-180 animate-float-fast hidden lg:block" />
        <div className="absolute top-[45%] right-[10%] w-2 h-2 md:w-3 md:h-3 rounded-full bg-pink-400 hidden md:block" />
        <div className="absolute bottom-[20%] left-[3%] w-10 h-10 md:w-16 md:h-16 hidden lg:block" style={{background: 'conic-gradient(from 45deg, #ff0080, #ffff00, #ff0080)', borderRadius: '50%'}} />
        <Triangle className="absolute bottom-[15%] left-[8%] w-4 h-4 md:w-6 md:h-6 text-orange-400 animate-float hidden md:block" />
        <Square className="absolute bottom-[25%] right-[5%] w-6 h-6 md:w-10 md:h-10 text-pink-400 rotate-12 hidden lg:block" />
        <div className="absolute bottom-[10%] right-[12%] w-3 h-3 md:w-5 md:h-5 rounded-full bg-orange-400 animate-float-slow hidden md:block" />
      </div>

      {/* Top Navigation Bar */}
      <nav className="relative z-20 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-gradient-to-b from-blue-500/90 to-blue-500/70 backdrop-blur-sm">
        <div className="flex items-center gap-4 md:gap-12">
          <h1 className="font-display text-xl md:text-2xl lg:text-3xl text-white">BabelGopher</h1>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4 lg:gap-8">
            <button className="text-white font-semibold text-sm lg:text-base hover:text-blue-100 transition-colors">Home</button>
            <button className="text-white font-semibold text-sm lg:text-base hover:text-blue-100 transition-colors">About</button>
            <button className="text-white font-semibold text-sm lg:text-base hover:text-blue-100 transition-colors">Services</button>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white z-30"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop User Button */}
        <button className="hidden md:flex items-center gap-2 bg-white/90 hover:bg-white px-3 lg:px-5 py-2 rounded-full text-blue-600 font-semibold text-sm lg:text-base transition-colors">
          <User size={16} className="lg:w-[18px] lg:h-[18px]" />
          <span>User 751</span>
        </button>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-blue-600/95 backdrop-blur-sm md:hidden z-20 py-4 px-6 space-y-4">
            <button className="block w-full text-left text-white font-semibold py-2">Home</button>
            <button className="block w-full text-left text-white font-semibold py-2">About</button>
            <button className="block w-full text-left text-white font-semibold py-2">Services</button>
            <button className="flex items-center gap-2 bg-white text-blue-600 font-semibold py-2 px-4 rounded-full mt-4">
              <User size={16} />
              <span>User 751</span>
            </button>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="relative z-10 h-full flex flex-col items-center justify-start">

        {/* Speech Bubbles Container */}
        <div className="relative w-full h-[50vh] flex items-center justify-center">
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

        {/* Form Card and Mic Buttons Container - Positioned lower */}
        <div className="relative w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-4 md:gap-8 px-4 mt-8">

          {/* Left Mic Button - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex flex-col items-center gap-3 order-1">
            <button
              type="button"
              onClick={() => alert('Test your microphone')}
              className="w-20 h-20 xl:w-24 xl:h-24 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 border-4 border-orange-200 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Mic size={32} className="xl:w-9 xl:h-9 text-white" />
            </button>
            <span className="text-white font-semibold text-xs xl:text-sm drop-shadow-lg text-center">Test Your<br/>Your Mic</span>
          </div>

          {/* Blue Form Card */}
          <div className="w-full max-w-md lg:w-[450px] bg-blue-500 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl order-2">
            <form onSubmit={handleJoin} className="space-y-4 md:space-y-5">

              {/* Your Name Input */}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full px-4 py-3 md:px-5 md:py-4 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-300 text-base md:text-lg"
                required
              />

              {/* Room Code Input */}
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Room Code"
                className="w-full px-4 py-3 md:px-5 md:py-4 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-300 text-base md:text-lg"
                required
              />

              {/* Language Selector with Flags */}
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
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

              {/* Join Conference Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold py-3 md:py-4 rounded-full text-lg md:text-xl shadow-lg transition-all ${
                  loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105'
                }`}
              >
                {loading ? 'Connecting...' : 'Join Conference'}
              </button>
            </form>
          </div>

          {/* Right Speaker Buttons - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex flex-col gap-4 order-3">
            <button
              type="button"
              className="w-20 h-20 xl:w-24 xl:h-24 rounded-full bg-gradient-to-br from-teal-300 to-teal-400 border-4 border-teal-200 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Volume2 size={32} className="xl:w-9 xl:h-9 text-white" />
            </button>
            <button
              type="button"
              className="w-20 h-20 xl:w-24 xl:h-24 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 border-4 border-pink-200 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Volume2 size={32} className="xl:w-9 xl:h-9 text-white" />
            </button>
          </div>

          {/* Mobile Audio Buttons - Shown only on mobile */}
          <div className="flex lg:hidden items-center justify-center gap-4 mt-4 order-4">
            <button
              type="button"
              onClick={() => alert('Test your microphone')}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 border-3 border-orange-200 flex items-center justify-center shadow-xl"
            >
              <Mic size={24} className="text-white" />
            </button>
            <button
              type="button"
              className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-300 to-teal-400 border-3 border-teal-200 flex items-center justify-center shadow-xl"
            >
              <Volume2 size={24} className="text-white" />
            </button>
            <button
              type="button"
              className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 border-3 border-pink-200 flex items-center justify-center shadow-xl"
            >
              <Volume2 size={24} className="text-white" />
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
