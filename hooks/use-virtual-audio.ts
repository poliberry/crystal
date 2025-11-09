import { useEffect, useState } from 'react';

interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
}

export const useVirtualAudio = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [virtualDevice, setVirtualDevice] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're running in Electron
    setIsElectron(!!window.audioAPI);
  }, []);

  const createVirtualMic = async () => {
    if (!isElectron) return null;

    try {
      const result = await window.audioAPI.createVirtualMic();
      if (result.success && result.deviceId) {
        setVirtualDevice(result.deviceId);
        return result.deviceId;
      }
      return null;
    } catch (error) {
      console.error('Failed to create virtual microphone:', error);
      return null;
    }
  };

  const listAudioDevices = async () => {
    if (!isElectron) return [];

    try {
      const result = await window.audioAPI.listAudioDevices();
      if (result.success && result.devices) {
        return result.devices;
      }
      return [];
    } catch (error) {
      console.error('Failed to list audio devices:', error);
      return [];
    }
  };

  return {
    isElectron,
    virtualDevice,
    createVirtualMic,
    listAudioDevices,
  };
};