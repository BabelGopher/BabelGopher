import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { BrowserWarning } from '../components/BrowserWarning';
import { SpeechBubble } from '../components/landing/SpeechBubble';
import { Circle, Square, Triangle } from '../components/shapes';
import { Button, Input } from '../components/ui';

export default function LobbyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '', roomCode: '' });

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors = { name: '', roomCode: '' };
    let hasErrors = false;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      hasErrors = true;
    }

    if (!roomCode.trim()) {
      newErrors.roomCode = 'Room code is required';
      hasErrors = true;
    }

    setErrors(newErrors);

    if (hasErrors) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      router.push(`/room/${roomCode}?name=${encodeURIComponent(name)}`);
    }, 1000);
  };

  return (
    <>
      <BrowserWarning />
      <main className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-orange-100 via-pink-100 to-rose-200 md:bg-gradient-to-br md:from-purple-400 md:via-pink-300 md:to-blue-300">
      {/* Background Image - Tower of Babel - Hidden on mobile */}
      <div
        className="hidden md:block absolute top-[56px] left-0 right-0 bottom-0 bg-contain bg-center bg-no-repeat"
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
      <div className="relative z-10 h-full flex flex-col items-center justify-end pb-8 md:justify-start md:pb-0 md:-translate-y-10">

        {/* Mobile Background Gopher - Hero element */}
        <div className="md:hidden absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/transparant-gopher.png"
            alt=""
            className="w-full max-w-lg opacity-55"
            style={{ transform: 'translateY(-25%)' }}
          />
        </div>

        {/* Speech Bubbles Container - Hidden on mobile */}
        <div className="hidden md:block relative w-full h-[50vh]">
          {/* Speech Bubbles positioned around Gopher */}
          <div className="absolute top-[28%] left-[32%] z-30 animate-float" style={{ animationDelay: '0s' }}>
            <SpeechBubble
              bgColor="#86E37D"
              textColor="#000000"
              tailDirection="bottom-right"
              className="text-sm md:text-base w-fit"
            >
              Hello
            </SpeechBubble>
          </div>

          <div className="absolute top-[25%] right-[30%] z-30 animate-float-slow" style={{ animationDelay: '1s' }}>
            <SpeechBubble
              bgColor="#FFA860"
              textColor="#FFFFFF"
              tailDirection="bottom-left"
              className="text-sm md:text-base w-fit"
            >
              你好
            </SpeechBubble>
          </div>

          <div className="absolute top-[52%] right-[24%] z-30 animate-float-fast" style={{ animationDelay: '0.5s' }}>
            <SpeechBubble
              bgColor="#6EE7B7"
              textColor="#000000"
              tailDirection="bottom-left"
              className="text-sm md:text-base w-fit"
            >
              안녕
            </SpeechBubble>
          </div>

          <div className="absolute top-[48%] left-[27%] z-30 animate-float-reverse" style={{ animationDelay: '2s' }}>
            <SpeechBubble
              bgColor="#F472B6"
              textColor="#FFFFFF"
              tailDirection="top-right"
              className="text-sm md:text-base w-fit"
            >
              Hola
            </SpeechBubble>
          </div>

          <div className="absolute top-[72%] left-[34%] z-30 animate-float" style={{ animationDelay: '1.5s' }}>
            <SpeechBubble
              bgColor="#FCD34D"
              textColor="#000000"
              tailDirection="top-right"
              className="text-sm md:text-base w-fit"
            >
              こんにちは
            </SpeechBubble>
          </div>

          <div className="absolute top-[70%] right-[27%] z-30 animate-float-slow" style={{ animationDelay: '2.5s' }}>
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

        {/* Form Card */}
        <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center gap-4 md:gap-8 px-4 mb-8 md:mt-8 md:mb-0">
          {/* Form Card */}
          <div className="relative z-20 w-full max-w-md lg:w-[450px] bg-white md:bg-white backdrop-blur-md md:backdrop-blur-none rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl">
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
        </div>
      </div>
      </main>
    </>
  );
}
