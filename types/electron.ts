export interface AudioAPI {
  createVirtualMic: () => Promise<{ success: boolean; deviceId?: string; error?: string }>;
  listAudioDevices: () => Promise<{
    success: boolean;
    devices?: Array<{ id: string; name: string; type: 'input' | 'output' }>;
    error?: string;
  }>;
}

declare global {
  interface Window {
    audioAPI?: AudioAPI;
    desktopAPI?: {
      getSources: (options: any) => Promise<Array<{ id: string; name: string }>>;
      checkScreenRecordingPermission: () => Promise<boolean>;
      requestScreenRecordingPermission: () => Promise<boolean>;
    };
    platform?: string;
  }
}