import React from 'react';

interface CircleProps {
  className?: string;
}

export const Circle: React.FC<CircleProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
    >
      <circle cx="50" cy="50" r="50" />
    </svg>
  );
};
