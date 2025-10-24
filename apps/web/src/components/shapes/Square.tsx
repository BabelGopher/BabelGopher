import React from 'react';

interface SquareProps {
  className?: string;
}

export const Square: React.FC<SquareProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
    >
      <rect x="0" y="0" width="100" height="100" />
    </svg>
  );
};
