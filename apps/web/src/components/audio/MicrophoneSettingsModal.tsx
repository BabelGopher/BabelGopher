import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MicrophoneSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMic: string;
  onMicSelect: (deviceId: string) => void;
}

export const MicrophoneSettingsModal: React.FC<MicrophoneSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedMic,
  onMicSelect,
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
      const microphones = deviceList.filter(d => d.kind === 'audioinput');
      setDevices(microphones);
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setTestError('Failed to access microphones');
    }
  };

  const testMicrophone = async () => {
    setIsTesting(true);
    setTestError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedMic || undefined }
      });
      // Record 2 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setIsTesting(false);
      }, 2000);
    } catch (err) {
      console.error('Mic test failed:', err);
      setTestError('Failed to access microphone');
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-rose-800 font-bold text-lg">Microphone Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Microphone Select */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Select Microphone:
          </label>
          <select
            value={selectedMic}
            onChange={(e) => onMicSelect(e.target.value)}
            aria-label="Select microphone device"
            className="w-full px-4 py-2 bg-white/85 border-2 border-rose-100 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            {devices.length === 0 ? (
              <option value="default">Default Microphone</option>
            ) : (
              devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${devices.indexOf(device) + 1}`}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Test Button */}
        <button
          onClick={testMicrophone}
          disabled={isTesting}
          aria-label="Test microphone to verify it's working"
          className={`w-full py-2 rounded-lg font-semibold transition-all ${
            isTesting
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-rose-800 text-white hover:bg-rose-900 active:scale-95'
          }`}
        >
          {isTesting ? 'Testing...' : 'Test Microphone'}
        </button>

        {/* Error Message */}
        {testError && (
          <p className="mt-2 text-red-600 text-sm text-center" role="alert">{testError}</p>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close microphone settings"
          className="w-full mt-3 py-2 rounded-lg font-semibold border-2 border-rose-200 text-rose-800 hover:bg-rose-50 transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
};
