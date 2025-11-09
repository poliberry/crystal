interface ScreenShareSource {
  id: string;
  name: string;
  displayId?: string;
  appIcon?: string;
  thumbnail: string;
}

interface ScreenRecordingPermissionResult {
  granted: boolean;
  openedPreferences?: boolean;
}

interface DesktopAPI {
  getSources(options: { types: Array<'screen' | 'window'> }): Promise<ScreenShareSource[]>;
  checkScreenRecordingPermission(): Promise<ScreenRecordingPermissionResult>;
  requestScreenRecordingPermission(): Promise<ScreenRecordingPermissionResult>;
}

declare global {
  interface Window {
    desktopAPI: DesktopAPI;
  }
}

export {};