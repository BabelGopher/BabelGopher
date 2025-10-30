import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSettings } from '../../hooks/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMicrophoneChange?: (deviceId: string) => void; // Callback for LiveKit device switching
}

export function SettingsModal({ isOpen, onClose, onMicrophoneChange }: SettingsModalProps) {
  const { audioDevices, setMicrophone, setSpeaker } = useSettings();

  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState(audioDevices.microphone);
  const [selectedSpeaker, setSelectedSpeaker] = useState(audioDevices.speaker);

  // Load audio devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === 'audioinput');
        const audioOutputs = devices.filter((device) => device.kind === 'audiooutput');

        setMicrophones(audioInputs);
        setSpeakers(audioOutputs);
      } catch (error) {
        console.error('Error loading audio devices:', error);
      }
    };

    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  // Sync local state with global state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMic(audioDevices.microphone);
      setSelectedSpeaker(audioDevices.speaker);
    }
  }, [isOpen, audioDevices]);

  const handleSave = () => {
    // Update global settings
    setMicrophone(selectedMic);
    setSpeaker(selectedSpeaker);

    // Notify LiveKit of microphone change if callback provided
    if (onMicrophoneChange && selectedMic !== audioDevices.microphone) {
      onMicrophoneChange(selectedMic);
    }

    onClose();
  };

  const handleCancel = () => {
    // Reset to current settings
    setSelectedMic(audioDevices.microphone);
    setSelectedSpeaker(audioDevices.speaker);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Audio Settings"
    >
      <div className="space-y-6">
        {/* Microphone Selection */}
        <div>
          <label htmlFor="microphone" className="block text-sm font-medium text-gray-200 mb-2">
            Microphone
          </label>
          <select
            id="microphone"
            value={selectedMic}
            onChange={(e) => setSelectedMic(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="default">System Default</option>
            {microphones.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Speaker Selection */}
        <div>
          <label htmlFor="speaker" className="block text-sm font-medium text-gray-200 mb-2">
            Speaker / Headphones
          </label>
          <select
            id="speaker"
            value={selectedSpeaker}
            onChange={(e) => setSelectedSpeaker(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="default">System Default</option>
            {speakers.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
