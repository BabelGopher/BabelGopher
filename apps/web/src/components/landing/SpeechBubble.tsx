import React from 'react';

interface SpeechBubbleProps {
  children: React.ReactNode;
  bgColor: string;
  textColor?: string;
  tailDirection: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  children,
  bgColor,
  textColor = 'white',
  tailDirection,
  className = '',
}) => {
  // Tail positioning based on direction
  const tailPositions = {
    'top-left': 'bottom-0 left-6 translate-y-1/2',
    'top-right': 'bottom-0 right-6 translate-y-1/2',
    'bottom-left': 'top-0 left-6 -translate-y-1/2',
    'bottom-right': 'top-0 right-6 -translate-y-1/2',
  };

  // SVG path for smooth tail (pointing down for top bubbles, up for bottom bubbles)
  const tailPaths = {
    'top-left': 'M3,0 Q5,4 1,6 Q4,3 3,0 Z', // Points down-right
    'top-right': 'M7,0 Q5,4 9,6 Q6,3 7,0 Z', // Points down-left
    'bottom-left': 'M3,10 Q5,6 1,4 Q4,7 3,10 Z', // Points up-right
    'bottom-right': 'M7,10 Q5,6 9,4 Q6,7 7,10 Z', // Points up-left
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-lg font-bold relative z-10 whitespace-nowrap border-2 border-black"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {children}
      </div>
      {/* SVG Tail */}
      <svg
        className={`absolute w-3 h-3 md:w-4 md:h-4 ${tailPositions[tailDirection]}`}
        viewBox="0 0 10 10"
      >
        <path d={tailPaths[tailDirection]} fill={bgColor} stroke="#000" strokeWidth="0.8" />
      </svg>
    </div>
  );
};
