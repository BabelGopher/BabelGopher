import React, { useState, useEffect } from 'react';
import { X, Volume2 } from 'lucide-react';

interface SpeakerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSpeaker: string;
  onSpeakerSelect: (deviceId: string) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export const SpeakerSettingsModal: React.FC<SpeakerSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedSpeaker,
  onSpeakerSelect,
  volume,
  onVolumeChange,
}) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState('');

  useEffect(() => {
    if (isOpen) {
      enumerateDevices();
      setTestError('');
    }
  }, [isOpen]);

  const enumerateDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const speakers = deviceList.filter(d => d.kind === 'audiooutput');
      setDevices(speakers);
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setTestError('Failed to access speakers');
    }
  };

  const testSpeaker = async () => {
    setIsTesting(true);
    setTestError('');
    try {
      // Create simple test tone (A4 note: 440Hz)
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported');
      }
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.frequency.value = 440;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.1 * (volume / 100), audioContext.currentTime);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        setIsTesting(false);
      }, 500);
    } catch (err) {
      console.error('Speaker test failed:', err);
      setTestError('Speaker test failed');
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-rose-800 font-bold text-lg">Speaker Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Speaker Select */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Select Speaker:
          </label>
          <select
            value={selectedSpeaker}
            onChange={(e) => onSpeakerSelect(e.target.value)}
            aria-label="Select speaker device"
            className="w-full px-4 py-2 bg-white/85 border-2 border-rose-100 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            {devices.length === 0 ? (
              <option value="default">Default Speaker</option>
            ) : (
              devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${devices.indexOf(device) + 1}`}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Volume Slider */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-rose-800" />
              Volume: {volume}%
            </div>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Speaker volume slider"
            className="w-full h-2 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-800"
          />
        </div>

        {/* Test Button */}
        <button
          onClick={testSpeaker}
          disabled={isTesting}
          aria-label="Test speaker with a tone"
          className={`w-full py-2 rounded-lg font-semibold transition-all ${
            isTesting
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-rose-800 text-white hover:bg-rose-900 active:scale-95'
          }`}
        >
          {isTesting ? 'Playing...' : 'Test Speaker'}
        </button>

        {/* Error Message */}
        {testError && (
          <p className="mt-2 text-red-600 text-sm text-center" role="alert">{testError}</p>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close speaker settings"
          className="w-full mt-3 py-2 rounded-lg font-semibold border-2 border-rose-200 text-rose-800 hover:bg-rose-50 transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
};
