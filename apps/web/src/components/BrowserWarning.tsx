import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { isChromeOrChromium, getBrowserName } from '../utils/browserDetection';

export const BrowserWarning: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Only show warning if not using Chrome/Chromium
    if (!isChromeOrChromium()) {
      setIsVisible(true);
    }
  }, []);

  if (!isClient || !isVisible) return null;

  const browserName = getBrowserName();

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-amber-50 border-b-2 border-amber-300 px-4 py-3 md:px-6 md:py-4 shadow-md">
      <div className="max-w-6xl mx-auto flex items-start md:items-center gap-3 md:gap-4">
        <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5 md:mt-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base text-amber-800 font-semibold">
            Optimal Browser Recommended
          </p>
          <p className="text-xs md:text-sm text-amber-700 mt-1">
            BabelGopher works best with Chrome, Edge, or Brave. You're using {browserName}, which may have limited support for real-time audio features.
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 text-amber-600 hover:text-amber-800 transition-colors p-1"
          aria-label="Close browser warning"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
