import React from 'react';

interface TriangleProps {
  className?: string;
}

export const Triangle: React.FC<TriangleProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
    >
      <polygon points="50,10 90,90 10,90" />
    </svg>
  );
};
