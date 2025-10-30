/**
 * Browser detection utility for BabelGopher
 * Chrome is recommended for optimal Web Audio API and MediaDevices API support
 */

declare global {
  interface Window {
    chrome?: Record<string, unknown>;
  }
}

export const isChromeOrChromium = (): boolean => {
  if (typeof window === 'undefined') return true; // SSR - assume true

  const userAgent = navigator.userAgent;

  // Check for Chrome or Chromium-based browsers (Edge, Brave, Opera, Vivaldi, etc.)
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isChromium = window.chrome !== null && typeof window.chrome !== 'undefined';

  return isChrome || isChromium;
};

export const getBrowserName = (): string => {
  if (typeof window === 'undefined') return 'Unknown';

  const userAgent = navigator.userAgent;

  // Firefox
  if (userAgent.indexOf('Firefox') > -1) return 'Firefox';

  // Safari
  if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) return 'Safari';

  // Edge
  if (userAgent.indexOf('Edg') > -1) return 'Edge';

  // Opera
  if (userAgent.indexOf('OPR') > -1) return 'Opera';

  // Chrome or Chromium
  if (isChromeOrChromium()) return 'Chrome';

  return 'Unknown';
};
