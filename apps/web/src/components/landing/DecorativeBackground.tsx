import React from 'react';
import { Circle, Triangle, Square } from '../shapes';

export const DecorativeBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {/* Floating Geometric Shapes */}
      <Square className="absolute top-[8%] left-[5%] w-12 h-12 text-yellow-400 opacity-80 animate-float-slow" />
      <Circle className="absolute top-[15%] right-[8%] w-20 h-20 text-pink-400 opacity-80 animate-float" />
      <Triangle className="absolute top-[35%] left-[10%] w-16 h-16 text-purple-400 opacity-80 animate-float-reverse" />
      <Square className="absolute top-[50%] right-[15%] w-14 h-14 text-blue-400 opacity-80 animate-float-fast" />
      <Circle className="absolute bottom-[20%] left-[20%] w-10 h-10 text-green-400 opacity-80 animate-float-slow" />
      <Triangle className="absolute bottom-[15%] right-[10%] w-12 h-12 text-orange-400 opacity-80 animate-float" />
      <Square className="absolute top-[25%] right-[25%] w-8 h-8 text-teal-400 opacity-80 animate-float-fast" />
      <Circle className="absolute bottom-[35%] left-[15%] w-16 h-16 text-red-400 opacity-80 animate-float-reverse" />

      {/* Speech Bubbles with Greetings */}
      <div className="absolute top-[12%] left-[15%] bg-white px-4 py-2 rounded-2xl shadow-lg font-body text-sm md:text-base font-semibold text-gray-800 animate-float-fast">
        Hello!
      </div>
      <div className="absolute top-[20%] right-[20%] bg-white px-4 py-2 rounded-2xl shadow-lg font-body text-sm md:text-base font-semibold text-gray-800 animate-float-slow">
        Hola!
      </div>
      <div className="absolute top-[40%] left-[8%] bg-white px-4 py-2 rounded-2xl shadow-lg font-body text-sm md:text-base font-semibold text-gray-800 animate-float">
        안녕!
      </div>
      <div className="absolute top-[45%] right-[5%] bg-white px-4 py-2 rounded-2xl shadow-lg font-body text-sm md:text-base font-semibold text-gray-800 animate-float-reverse">
        Bonjour!
      </div>
      <div className="absolute bottom-[25%] left-[25%] bg-white px-4 py-2 rounded-2xl shadow-lg font-body text-sm md:text-base font-semibold text-gray-800 animate-float-fast">
        你好!
      </div>
      <div className="absolute bottom-[30%] right-[30%] bg-white px-4 py-2 rounded-2xl shadow-lg font-body text-sm md:text-base font-semibold text-gray-800 animate-float-slow">
        Ciao!
      </div>
      <div className="absolute bottom-[10%] left-[35%] bg-white px-4 py-2 rounded-2xl shadow-lg font-body text-sm md:text-base font-semibold text-gray-800 animate-float">
        Привет!
      </div>
    </div>
  );
};
