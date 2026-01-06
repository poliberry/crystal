"use client";

// Vesktop Types
declare namespace Vesktop {
  interface AudioNode {
    "application.name"?: string;
    "application.process.binary"?: string;
    "application.process.id"?: string;
    "node.name"?: string;
    "media.class"?: string;
    "media.name"?: string;
    "device.id"?: string;
  }

  type SpecialSource = "None" | "Entire System";
  type AudioSource = SpecialSource | AudioNode;
  type AudioSources = SpecialSource | AudioNode[];

  interface StreamSettings {
    audio?: boolean;
    contentHint?: "motion" | "detail";
    includeSources?: AudioSources;
    excludeSources?: AudioSources;
  }

  interface StreamPick extends StreamSettings {
    id: string;
  }

  interface Source {
    id: string;
    name: string;
    url: string;
  }

  interface IpcCommands {
    respond(command: { message: string; data: any }): Promise<any>;
  }

  interface VirtMic {
    list(): Promise<{ ok: boolean; targets: AudioNode[]; hasPipewirePulse: boolean }>;
    start(sources: AudioNode[]): Promise<void>;
    startSystem(excludeSources: AudioNode[]): Promise<void>;
    stop(): Promise<void>;
  }

  interface DesktopAPI {
    getSources(options: { types: string[] }): Promise<Array<{ id: string; name: string; thumbnail: string; }>>;
  }

  interface ScreenShare {
    openPickerWindow(skipPicker?: boolean): Promise<{ id: string; contentHint?: string; includeSources?: any; excludeSources?: any; audio?: boolean } | null>;
  }

  interface VesktopNative {
    commands: IpcCommands;
    virtmic: VirtMic;
    screenShare: ScreenShare;
  }
}

// Crystal Electron Native API Types
declare namespace Crystal {
  interface ScreenShare {
    getSources(): Promise<Array<{ id: string; name: string; thumbnail: string }>>;
    openPicker(skipPicker?: boolean): Promise<{
      id: string;
      contentHint?: "motion" | "detail";
      audio?: boolean;
      includeSources?: any;
      excludeSources?: any;
    } | null>;
    pick(choice: any): void;
    cancel(): void;
  }

  interface Audio {
    getSources(): Promise<{ ok: boolean; sources?: any[]; error?: string }>;
    startCapture(options?: { includeSources?: any; excludeSources?: any; sampleRate?: number; includeProcesses?: number[]; excludeProcesses?: number[] }): Promise<{ ok: boolean; error?: string; sampleRate?: number; message?: string }>;
    stopCapture(): Promise<{ ok: boolean; error?: string }>;
    onAudioData(callback: (data: { data: number[]; sampleRate: number; channels: number }) => void): () => void;
    onAudioError(callback: (error: { error: string }) => void): () => void;
  }

  interface Platform {
    get(): string;
    isWindows(): boolean;
    isLinux(): boolean;
    isMacOS(): boolean;
  }

  interface CrystalNative {
    screenShare: ScreenShare;
    audio: Audio;
    platform: Platform;
  }
}

declare global {
  interface Window {
    VesktopNative?: Vesktop.VesktopNative;
    CrystalNative?: Crystal.CrystalNative;
    platform?: string;
    electron?: {
      desktopCapturer: {
        getSources(options: { types: string[]; thumbnailSize?: { width: number; height: number; }; fetchWindowIcons?: boolean }): Promise<Array<{
          id: string;
          name: string;
          thumbnail: any; // Electron.NativeImage
          display_id: string;
          appIcon: any | null; // Electron.NativeImage
        }>>;
      };
    };
  }
}

import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  TrackRefContext,
  TrackReference,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  useTrackRefContext,
  useTracks,
  VideoConference,
} from "@livekit/components-react";
import { useVirtualAudio } from "@/hooks/use-virtual-audio";
import {
  Camera,
  CameraOff,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  MonitorDown,
  MonitorUp,
  Phone,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";

import "@livekit/components-styles";
import { FloatingCallCard } from "./call-ui";
import { useLiveKit } from "./providers/media-room-provider";
import { cn } from "@/lib/utils";
import { Track } from "livekit-client";
import { Channel, Server } from "@/types/conversation";
import { RoomServiceClient } from "livekit-server-sdk";
import { roomService } from "@/lib/livekit-room-service";
import { ActionTooltip } from "./action-tooltip";
import { Button } from "./ui/button";
import { ChatHeader } from "./chat/chat-header";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from "./ui/popover";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

// Vesktop Types
type SpecialSource = "None" | "Entire System";
type Node = {
  "media.class"?: string;
  "media.name"?: string;
  "node.name"?: string;
  "device.id"?: string;
  "application.name"?: string;
  "application.process.binary"?: string;
  "application.process.id"?: string;
};
type AudioSource = SpecialSource | Node;
type AudioSources = SpecialSource | Node[];
interface StreamSettings {
  audio: boolean;
  contentHint?: string;
  includeSources?: AudioSources;
  excludeSources?: AudioSources;
}
interface StreamPick extends StreamSettings {
  id: string;
}
interface IpcResponse<T = any> {
  nonce: string;
  ok: boolean;
  data: T;
}

type MediaRoomProps = {
  channel: Channel;
  server: Server | null;
};

export const MediaRoom = ({ channel, server }: MediaRoomProps) => {
  const livekit = useLiveKit();
  const room = useRoomContext();
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [activeParticipant, setActiveParticipant] = useState<any>(null);
  const [activeScreenShare, setActiveScreenShare] = useState<any>(null);
  const { localParticipant } = useLocalParticipant();
  const { isElectron, virtualDevice, createVirtualMic } = useVirtualAudio();
  const remoteParticipants = useRemoteParticipants();
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraPopoverOpen, setCameraPopoverOpen] = useState(false);
  const [activeInputDeviceId, setActiveInputDeviceId] = useState<string | null>(null);
  const [activeCameraDeviceId, setActiveCameraDeviceId] = useState<string | null>(null);

  // Volume controls state
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({});
  const [screenshareVolumes, setScreenshareVolumes] = useState<Record<string, number>>({});

  // Screenshare subscription state (opt-in viewing)
  const [subscribedScreenshares, setSubscribedScreenshares] = useState<Set<string>>(new Set());

  // Pagination state for gallery grid
  const [currentPage, setCurrentPage] = useState(0);

  // Audio element refs for volume control
  const audioElementRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Function to enumerate and update all devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(devices.filter((d) => d.kind === "audioinput"));
      setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      setCameraDevices(devices.filter((d) => d.kind === "videoinput"));
      console.log("Enumerated devices:", {
        audioInput: devices.filter((d) => d.kind === "audioinput").length,
        audioOutput: devices.filter((d) => d.kind === "audiooutput").length,
        videoInput: devices.filter((d) => d.kind === "videoinput").length,
        cameras: devices.filter((d) => d.kind === "videoinput").map(d => ({ id: d.deviceId, label: d.label }))
      });
    } catch (error) {
      console.error("Error enumerating devices:", error);
    }
  }, []);

  // Initial device enumeration
  useEffect(() => {
    enumerateDevices();
  }, []);

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log("Device change detected, re-enumerating...");
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [enumerateDevices]);

  // Re-enumerate devices when camera is enabled (to get proper labels after permission grant)
  useEffect(() => {
    if (localParticipant?.isCameraEnabled) {
      // Small delay to ensure permission is granted and devices are available
      const timer = setTimeout(() => {
        enumerateDevices();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [localParticipant?.isCameraEnabled]);

  // Refresh camera devices when popover opens (to ensure we have latest devices and labels)
  useEffect(() => {
    if (cameraPopoverOpen) {
      // Request camera permission to get proper device labels
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          // Stop the stream immediately, we just needed permission
          stream.getTracks().forEach(track => track.stop());
          // Now enumerate devices with proper labels
          enumerateDevices();
        })
        .catch((error) => {
          console.error("Error requesting camera permission:", error);
          // Still try to enumerate devices even if permission fails
          enumerateDevices();
        });
    }
  }, [cameraPopoverOpen, enumerateDevices]);

  // Switch to selected microphone when mic is enabled
  useEffect(() => {
    if (localParticipant?.isMicrophoneEnabled && room && activeInputDeviceId) {
      const switchMic = async () => {
        try {
          await room.switchActiveDevice("audioinput", activeInputDeviceId);
        } catch (error) {
          console.error("Error switching to selected microphone:", error);
        }
      };
      // Small delay to ensure track is ready
      const timer = setTimeout(switchMic, 300);
      return () => clearTimeout(timer);
    }
  }, [localParticipant?.isMicrophoneEnabled, room, activeInputDeviceId]);

  // Initialize default volumes
  useEffect(() => {
    const allParticipants = [localParticipant, ...remoteParticipants];
    allParticipants.forEach((participant) => {
      if (participant && !userVolumes[participant.identity]) {
        setUserVolumes((prev) => ({ ...prev, [participant.identity]: 1.0 }));
      }
    });
  }, [remoteParticipants, localParticipant]);



  // Calculate gallery grid layout
  // 1 user: full card (1x1)
  // 2 users: side by side (2x1)
  // 3 users: one half card, two cards stacked (2 cols: left 1 row, right 2 rows)
  // 4 users: 2x2 grid
  // 5 users: 3 on top, 2 on bottom (3 cols, 2 rows)
  // 6 users: 3x2 grid
  // 7 users: 4 on top, 3 on bottom (4 cols, 2 rows)
  // 8 users: 4x2 grid
  // 9 users: 3x3 grid
  // 10+ users: continue pattern
  const calculateGridLayout = (totalItems: number) => {
    if (totalItems === 0) return { cols: 1, rows: 1, layout: 'grid' };
    if (totalItems === 1) return { cols: 1, rows: 1, layout: 'grid' };
    if (totalItems === 2) return { cols: 2, rows: 1, layout: 'grid' };
    if (totalItems === 3) return { cols: 2, rows: 2, layout: 'asymmetric' }; // Special case: left 1, right 2
    if (totalItems === 4) return { cols: 2, rows: 2, layout: 'grid' };
    if (totalItems === 5) return { cols: 3, rows: 2, layout: 'grid' };
    if (totalItems === 6) return { cols: 3, rows: 2, layout: 'grid' };
    if (totalItems === 7) return { cols: 4, rows: 2, layout: 'grid' };
    if (totalItems === 8) return { cols: 4, rows: 2, layout: 'grid' };
    if (totalItems === 9) return { cols: 3, rows: 3, layout: 'grid' };
    if (totalItems <= 12) return { cols: 4, rows: 3, layout: 'grid' };
    if (totalItems <= 16) return { cols: 4, rows: 4, layout: 'grid' };
    if (totalItems <= 20) return { cols: 5, rows: 4, layout: 'grid' };
    if (totalItems <= 25) return { cols: 5, rows: 5, layout: 'grid' };
    // For more than 25, use pagination with 5x5 grid
    return { cols: 5, rows: 5, layout: 'grid' };
  };

  // Volume control functions
  const setUserVolume = (participantId: string, volume: number) => {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));

    // Update state
    setUserVolumes((prev) => {
      // Only update if different to avoid unnecessary re-renders
      if (prev[participantId] === clampedVolume) {
        return prev;
      }
      return { ...prev, [participantId]: clampedVolume };
    });

    // Update audio element volume immediately
    const audioEl = audioElementRefs.current[`user-${participantId}`];
    if (audioEl) {
      audioEl.volume = clampedVolume;
      // Mute if volume is 0 (local check will be handled by useEffect)
      if (clampedVolume === 0) {
        audioEl.muted = true;
      }
    }
  };

  const setScreenshareVolume = (trackSid: string, volume: number) => {
    // Clamp volume between 0 and 0.5
    const clampedVolume = Math.max(0, Math.min(0.5, volume));

    // Update state
    setScreenshareVolumes((prev) => {
      // Only update if different to avoid unnecessary re-renders
      if (prev[trackSid] === clampedVolume) {
        return prev;
      }
      return { ...prev, [trackSid]: clampedVolume };
    });

    // Update audio element volume immediately - find all audio elements that might be playing this track
    const audioEl = audioElementRefs.current[`screenshare-${trackSid}`];
    if (audioEl) {
      audioEl.volume = clampedVolume;
      // Mute if volume is 0 (local check will be handled by useEffect)
      if (clampedVolume === 0) {
        audioEl.muted = true;
      }
    }

    // Also update any other audio elements that might be playing this screenshare audio
    // Find all audio elements and check if they're playing screenshare audio
    setTimeout(() => {
      const allAudioElements = document.querySelectorAll('audio');
      allAudioElements.forEach((el: HTMLAudioElement) => {
        if (el.srcObject && el.srcObject instanceof MediaStream) {
          const audioTracks = el.srcObject.getAudioTracks();
          // Check if this audio element is playing a screenshare audio track
          // We'll update it if the volume state matches
          const currentVolume = screenshareVolumes[trackSid];
          if (currentVolume !== undefined && audioTracks.length > 0) {
            // Update volume for any screenshare audio
            el.volume = clampedVolume;
            if (clampedVolume === 0) {
              el.muted = true;
            } else if (el.muted && clampedVolume > 0) {
              // Only unmute if it was muted for volume, not for being local
              // The useEffect will handle the local check
            }
          }
        }
      });
    }, 0);
  };

  // Sync volume changes to audio elements - ALWAYS mute local participants
  useEffect(() => {
    Object.entries(userVolumes).forEach(([participantId, volume]) => {
      const audioEl = audioElementRefs.current[`user-${participantId}`];
      if (audioEl) {
        const isLocalParticipant = participantId === localParticipant.identity;
        const clampedVolume = Math.max(0, Math.min(1, volume));
        audioEl.volume = clampedVolume;
        // ALWAYS mute local participants, regardless of volume
        audioEl.muted = isLocalParticipant || clampedVolume === 0;
      }
    });
  }, [userVolumes, localParticipant]);

  // Additional effect to ensure local participant is always muted
  useEffect(() => {
    const localAudioEl = audioElementRefs.current[`user-${localParticipant.identity}`];
    if (localAudioEl) {
      localAudioEl.muted = true;
    }
  }, [localParticipant.identity]);

  // Screenshare subscription functions
  const subscribeToScreenshare = (trackSid: string) => {
    setSubscribedScreenshares((prev) => new Set([...prev, trackSid]));
  };

  const unsubscribeFromScreenshare = (trackSid: string) => {
    setSubscribedScreenshares((prev) => {
      const newSet = new Set(prev);
      newSet.delete(trackSid);
      return newSet;
    });
    if (activeScreenShare?.publication.trackSid === trackSid) {
      setActiveScreenShare(null);
    }
  };

  const handleSelectInput = async (deviceId: string) => {
    try {
      if (room && localParticipant.isMicrophoneEnabled) {
        await room.switchActiveDevice("audioinput", deviceId);
        setActiveInputDeviceId(deviceId);
      } else {
        // If mic is not enabled, just set the device for when it's enabled
        localParticipant.activeDeviceMap.set("audioinput", deviceId);
        setActiveInputDeviceId(deviceId);
      }
    } catch (error) {
      console.error("Error switching microphone:", error);
    }
  };

  const handleSelectOutput = async (deviceId: string) => {
    try {
      localParticipant.activeDeviceMap.set("audiooutput", deviceId);
      // Output device switching is handled by activeDeviceMap
    } catch (error) {
      console.error("Error switching speaker:", error);
    }
  };

  const handleSelectCamera = async (deviceId: string) => {
    try {
      if (room && localParticipant.isCameraEnabled) {
        await room.switchActiveDevice("videoinput", deviceId);
        setActiveCameraDeviceId(deviceId);
      } else {
        // If camera is not enabled, just set the device for when it's enabled
        localParticipant.activeDeviceMap.set("videoinput", deviceId);
        setActiveCameraDeviceId(deviceId);
      }
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant) return;

    // If disabling, just turn off screen share
    if (localParticipant.isScreenShareEnabled) {
      try {
        await localParticipant.setScreenShareEnabled(false);
        if (window.CrystalNative && window.CrystalNative.platform.isLinux()) {
          await window.CrystalNative.audio.stopCapture();
        }
      } catch (err) {
        console.error('Failed to disable screen share:', err);
      }
      return;
    }

    // If running in Electron (CrystalNative), use native screen share picker
    if (typeof window !== 'undefined' && window.CrystalNative) {
      try {
        const platform = window.CrystalNative.platform.get();
        const isWindows = window.CrystalNative.platform.isWindows();
        const isLinux = window.CrystalNative.platform.isLinux();
        const isMacOS = window.CrystalNative.platform.isMacOS();

        let choice: any = null;

        let systemDisplayStream: MediaStream | null = null;

        // On Windows/Linux, use custom picker
        choice = await window.CrystalNative.screenShare.openPicker(false);

        if (!choice) {
          // User cancelled or picker was aborted
          return;
        }

        console.log('Screen share choice:', choice);

        // Helper function to get video stream from selected source
        const getVideoStream = async (sourceId: string): Promise<MediaStream> => {
          return await navigator.mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId
              }
            } as any
          });
        };

        // Helper function to capture Linux system audio
        // First tries native PipeWire via getDisplayMedia, then falls back to virtual mic
        const captureLinuxAudio = async (
          includeSources: any,
          excludeSources: any,
          sourceId: string,
          onTrackEnd: () => void
        ): Promise<MediaStream | null> => {
          if (!window.CrystalNative) {
            console.error('CrystalNative not available');
            return null;
          }

          // First, try native PipeWire capture via getDisplayMedia with audio
          // This works when Electron's setDisplayMediaRequestHandler is configured
          // and xdg-desktop-portal supports audio capture
          try {
            console.log('Attempting native PipeWire audio capture via getDisplayMedia...', { sourceId });
            // Try with explicit audio request - Electron's handler will pass this to the portal
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: sourceId
                }
              } as any,
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 48000,
                channelCount: 2,
                // Explicitly request system audio
                systemAudio: 'include' as any
              } as any
            });

            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length > 0) {
              // Stop the video track (we already have it from the selected source)
              const videoTrack = displayStream.getVideoTracks()[0];
              if (videoTrack) {
                videoTrack.stop();
              }

              // Create separate audio stream
              const audioStream = new MediaStream(audioTracks);
              audioTracks[0].addEventListener('ended', onTrackEnd);

              console.log('Successfully captured Linux audio via native PipeWire');
              return audioStream;
            } else {
              // No audio tracks, stop the video track and fall through to virtual mic
              displayStream.getTracks().forEach(t => t.stop());
              console.log('No audio tracks in native PipeWire stream, falling back to virtual mic');
            }
          } catch (nativeErr) {
            console.log('Native PipeWire audio capture failed, falling back to virtual mic:', nativeErr);
          }

          // Fallback to virtual microphone approach
          if (!includeSources || includeSources === "None") {
            return null;
          }

          try {
            console.log('Using virtual microphone for Linux audio capture...');
            // Start virtual microphone via IPC
            const result = await window.CrystalNative.audio.startCapture({
              includeSources,
              excludeSources
            });

            if (!result.ok) {
              console.error('Failed to start audio capture:', result.error);
              return null;
            }

            // Wait for virtual mic device to appear (retry up to 10 times)
            let virtmicDevice = null;
            for (let attempt = 0; attempt < 10; attempt++) {
              await new Promise(resolve => setTimeout(resolve, 200));

              // Request permissions to ensure device labels are visible
              try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
              } catch (e) {
                // Ignore permission errors
              }

              const devices = await navigator.mediaDevices.enumerateDevices();
              virtmicDevice = devices.find(({ label }) =>
                label === "crystal-screen-share" || label === "vencord-screen-share"
              );

              if (virtmicDevice) {
                console.log('Found virtual mic device:', virtmicDevice.deviceId, virtmicDevice.label);
                break;
              }
            }

            if (!virtmicDevice) {
              console.error('Virtual microphone "crystal-screen-share" not found');
              const devices = await navigator.mediaDevices.enumerateDevices();
              console.log('Available audio devices:', devices
                .filter(d => d.kind === 'audioinput')
                .map(d => ({ deviceId: d.deviceId, label: d.label })));
              return null;
            }

            // Capture audio from the virtual microphone
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: virtmicDevice.deviceId },
                autoGainControl: false,
                echoCancellation: false,
                noiseSuppression: false,
                channelCount: 2,
                sampleRate: 48000,
                sampleSize: 16
              }
            });

            const audioTrack = audioStream.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.addEventListener('ended', onTrackEnd);
              console.log('Successfully captured audio from virtual mic');
              return audioStream;
            }

            return null;
          } catch (err) {
            console.error('Failed to capture Linux audio via virtual mic:', err);
            return null;
          }
        };

        // Helper function to capture Windows system audio (native loopback)
        const captureWindowsAudio = async (
          sourceId: string,
          onTrackEnd: () => void
        ): Promise<MediaStream | null> => {
          try {
            // Use getDisplayMedia to trigger Electron's loopback audio handler
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true
            } as any);

            // Extract audio tracks before modifying video
            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length === 0) {
              console.warn('No audio tracks in Windows display stream');
              displayStream.getTracks().forEach(t => t.stop());
              return null;
            }

            // Stop video track from display stream (we'll use our selected source)
            const displayVideoTrack = displayStream.getVideoTracks()[0];
            if (displayVideoTrack) {
              displayVideoTrack.stop();
            }

            // Create separate audio stream
            const audioStream = new MediaStream(audioTracks);
            audioTracks[0].addEventListener('ended', onTrackEnd);

            console.log('Captured Windows system audio via loopback');
            return audioStream;
          } catch (err) {
            console.error('Failed to capture Windows system audio:', err);
            return null;
          }
        };

        // Helper function to capture macOS system audio using native loopback
        const captureMacOSAudio = async (
          sourceId: string,
          onTrackEnd: () => void
        ): Promise<MediaStream | null> => {
          try {
            // Use getDisplayMedia to trigger Electron's loopback audio handler
            const displayStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            } as any);

            // Extract audio tracks before modifying video
            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length === 0) {
              console.warn('No audio tracks in macOS display stream');
              displayStream.getTracks().forEach(t => t.stop());
              return null;
            }

            // Stop video track from display stream (we'll use our selected source)
            const displayVideoTrack = displayStream.getVideoTracks()[0];
            if (displayVideoTrack) {
              displayVideoTrack.stop();
            }

            // Create separate audio stream
            const audioStream = new MediaStream(audioTracks);
            audioTracks[0].addEventListener('ended', onTrackEnd);

            console.log('Captured macOS system audio via Electron loopback');
            return audioStream;
          } catch (err) {
            console.error('Failed to capture macOS system audio:', err);
            return null;
          }
        };

        // Legacy AudioTee function (kept for reference, not used)
        const captureMacOSAudioTee = async (
          onTrackEnd: () => void
        ): Promise<MediaStream | null> => {
          if (!window.CrystalNative) {
            console.error('CrystalNative not available');
            return null;
          }

          try {
            // Start AudioTee capture
            console.log('Starting AudioTee capture...');
            const result = await window.CrystalNative.audio.startCapture({
              sampleRate: 48000
            });

            console.log('AudioTee startCapture result:', result);

            if (!result.ok) {
              console.error('Failed to start AudioTee:', result.error, result.message);
              return null;
            }

            console.log('AudioTee started successfully, setting up audio listeners...');

            const sampleRate = result.sampleRate || 48000;
            const channels = 2; // Stereo

            // Create Web Audio API context to convert PCM to MediaStream
            const audioContext = new AudioContext({ sampleRate });
            const destination = audioContext.createMediaStreamDestination();

            // Create a silent oscillator to trigger ScriptProcessorNode
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0; // Silent
            oscillator.connect(gainNode);

            // Use ScriptProcessorNode for continuous audio processing
            // Need input channels for it to trigger!
            const bufferSize = 4096;
            const processor = audioContext.createScriptProcessor(bufferSize, channels, channels);

            // Circular buffer to hold audio data (separate buffers per channel)
            const bufferLength = sampleRate * 2; // 2 seconds of audio
            const audioBuffers: Float32Array[] = [];
            for (let i = 0; i < channels; i++) {
              audioBuffers.push(new Float32Array(bufferLength));
            }
            let writePosition = 0;
            let availableSamples = 0;

            // Connect: oscillator -> gain -> processor -> destination
            gainNode.connect(processor);
            processor.connect(destination);

            // Start the oscillator to trigger processing
            oscillator.start();

            console.log('Audio processing setup complete', {
              sampleRate,
              channels,
              bufferSize,
              bufferLength
            });

            // Track processing stats
            let processCount = 0;
            let lastAvailableSamples = 0;

            // Track audio levels for debugging
            let maxLevel = 0;
            let samplesWithAudio = 0;

            // Process audio in the ScriptProcessorNode
            processor.onaudioprocess = (e) => {
              processCount++;
              const outputBuffer = e.outputBuffer;
              const frameCount = outputBuffer.length;

              // Log every 100th process call to avoid spam
              if (processCount % 100 === 0) {
                console.log('ScriptProcessorNode processing', {
                  processCount,
                  availableSamples,
                  frameCount,
                  bufferLength,
                  maxLevel: maxLevel.toFixed(4),
                  samplesWithAudio
                });
                maxLevel = 0;
                samplesWithAudio = 0;
              }

              // Copy data from our circular buffer to the output
              for (let channel = 0; channel < channels; channel++) {
                const outputData = outputBuffer.getChannelData(channel);
                const channelBuffer = audioBuffers[channel];

                // Debug: check buffer contents periodically
                if (processCount % 100 === 0 && availableSamples > 0) {
                  const sampleAtWritePos = channelBuffer[writePosition];
                  const sampleAtReadPos = channelBuffer[(writePosition - availableSamples + bufferLength) % bufferLength];
                  console.log(`Channel ${channel} buffer check`, {
                    writePosition,
                    availableSamples,
                    sampleAtWritePos,
                    sampleAtReadPos,
                    bufferMin: Math.min(...Array.from(channelBuffer.slice(0, 1000))),
                    bufferMax: Math.max(...Array.from(channelBuffer.slice(0, 1000)))
                  });
                }

                for (let i = 0; i < frameCount; i++) {
                  if (availableSamples > 0) {
                    // Calculate read position: read from oldest available sample
                    const readPos = (writePosition - availableSamples + i + bufferLength) % bufferLength;
                    const sample = channelBuffer[readPos];
                    outputData[i] = sample;

                    // Track audio levels
                    const absSample = Math.abs(sample);
                    if (absSample > maxLevel) {
                      maxLevel = absSample;
                    }
                    if (absSample > 0.001) {
                      samplesWithAudio++;
                    }
                  } else {
                    // No data available, output silence
                    outputData[i] = 0;
                  }
                }
              }

              // Update available samples
              const previousAvailable = availableSamples;
              availableSamples = Math.max(0, availableSamples - frameCount);

              // Log if we're running out of data
              if (previousAvailable > 0 && availableSamples === 0 && processCount % 50 === 0) {
                console.warn('Audio buffer underrun - no data available');
              }
            };

            // Track received chunks
            let chunkCount = 0;
            let totalSamplesReceived = 0;

            // Listen for audio data from AudioTee
            console.log('Setting up audio data listener...');
            const removeAudioDataListener = window.CrystalNative.audio.onAudioData((chunk) => {
              chunkCount++;
              totalSamplesReceived += chunk.data.length;

              // Log first few chunks to verify data is coming
              if (chunkCount <= 5) {
                const firstSamples = Array.from(chunk.data.slice(0, 20));
                const maxSample = Math.max(...chunk.data.map(Math.abs));
                const nonZeroSamples = chunk.data.filter(s => Math.abs(s) > 100).length;

                console.log('Received AudioTee chunk #' + chunkCount, {
                  dataLength: chunk.data.length,
                  sampleRate: chunk.sampleRate,
                  channels: chunk.channels,
                  firstFewSamples: firstSamples,
                  maxSample,
                  nonZeroSamples,
                  hasAudio: maxSample > 100
                });
              }

              // Log every 50th chunk to avoid spam
              if (chunkCount % 50 === 0) {
                console.log('Received AudioTee chunk', {
                  chunkCount,
                  dataLength: chunk.data.length,
                  sampleRate: chunk.sampleRate,
                  channels: chunk.channels,
                  totalSamplesReceived,
                  availableSamples
                });
              }

              // Convert PCM data (Int16 array) to Float32 for Web Audio API
              const float32Data = new Float32Array(chunk.data.length);
              for (let i = 0; i < chunk.data.length; i++) {
                // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
                float32Data[i] = chunk.data[i] / 32768.0;
              }

              // AudioTee provides interleaved stereo PCM: [L, R, L, R, ...]
              // Write to circular buffer (de-interleave into separate channel buffers)
              const samples = float32Data.length / channels;

              // Debug: check first chunk's data
              if (chunkCount === 1) {
                console.log('Writing first chunk to buffer', {
                  samples,
                  float32DataLength: float32Data.length,
                  firstFewFloat32: Array.from(float32Data.slice(0, 10)),
                  maxFloat32: Math.max(...Array.from(float32Data.map(Math.abs)))
                });
              }

              for (let i = 0; i < samples; i++) {
                for (let channel = 0; channel < channels; channel++) {
                  const sampleIndex = i * channels + channel;
                  const channelBuffer = audioBuffers[channel];
                  const sampleValue = float32Data[sampleIndex];
                  channelBuffer[writePosition] = sampleValue;

                  // Debug first write
                  if (chunkCount === 1 && i === 0 && channel === 0) {
                    console.log('First sample written', {
                      sampleIndex,
                      sampleValue,
                      writePosition,
                      channelBufferLength: channelBuffer.length
                    });
                  }
                }

                writePosition = (writePosition + 1) % bufferLength;
                availableSamples = Math.min(bufferLength, availableSamples + 1);
              }

              // Log buffer status periodically
              if (chunkCount % 50 === 0) {
                // Check actual buffer values
                const firstChannelBuffer = audioBuffers[0];
                const bufferSample = firstChannelBuffer[writePosition];
                const bufferMin = Math.min(...Array.from(firstChannelBuffer.slice(Math.max(0, writePosition - 100), writePosition + 100)));
                const bufferMax = Math.max(...Array.from(firstChannelBuffer.slice(Math.max(0, writePosition - 100), writePosition + 100)));

                console.log('Audio buffer status', {
                  availableSamples,
                  bufferLength,
                  writePosition,
                  utilization: (availableSamples / bufferLength * 100).toFixed(1) + '%',
                  bufferSampleAtWritePos: bufferSample,
                  bufferMin,
                  bufferMax
                });
              }
            });

            // Listen for errors
            console.log('Setting up audio error listener...');
            const removeErrorListener = window.CrystalNative.audio.onAudioError((error) => {
              console.error('AudioTee error received:', error.error);
            });

            // Set a timeout to check if we're receiving data
            setTimeout(() => {
              if (chunkCount === 0) {
                console.error('No audio chunks received after 2 seconds! AudioTee may not be sending data.');
              } else {
                console.log('Audio chunks are being received:', chunkCount);
              }
            }, 2000);

            // Cleanup on track end
            const originalOnTrackEnd = onTrackEnd;
            onTrackEnd = async () => {
              removeAudioDataListener();
              removeErrorListener();
              oscillator.stop();
              processor.disconnect();
              gainNode.disconnect();
              await window.CrystalNative!.audio.stopCapture();
              audioContext.close();
              originalOnTrackEnd();
            };

            // Get the MediaStream from destination
            const audioStream = destination.stream;
            const audioTrack = audioStream.getAudioTracks()[0];

            if (audioTrack) {
              // Ensure track is enabled and ready
              audioTrack.enabled = true;
              audioTrack.addEventListener('ended', onTrackEnd);

              // Create a test audio element to verify audio is working
              const testAudio = document.createElement('audio');
              testAudio.srcObject = audioStream;
              testAudio.autoplay = true;
              testAudio.volume = 1.0; // Full volume for testing
              testAudio.muted = false;

              // Try to play immediately
              testAudio.play().then(() => {
                console.log('Test audio element started playing');
              }).catch(err => {
                console.error('Failed to play test audio:', err);
              });

              document.body.appendChild(testAudio);

              // Monitor audio element state
              testAudio.addEventListener('play', () => {
                console.log('Test audio element is playing');
              });

              testAudio.addEventListener('pause', () => {
                console.log('Test audio element paused');
              });

              testAudio.addEventListener('error', (e) => {
                console.error('Test audio element error:', e);
              });

              // Log test audio element
              console.log('Created test audio element to verify audio stream', {
                audioElement: testAudio,
                paused: testAudio.paused,
                muted: testAudio.muted,
                volume: testAudio.volume,
                readyState: testAudio.readyState,
                srcObject: testAudio.srcObject
              });

              // Monitor track state
              const trackStateMonitor = setInterval(() => {
                if (audioTrack.readyState === 'ended') {
                  clearInterval(trackStateMonitor);
                  return;
                }

                // Get track settings to verify it's producing audio
                const settings = audioTrack.getSettings();
                const constraints = audioTrack.getConstraints();
                const capabilities = audioTrack.getCapabilities();

                console.log('Audio track state check', {
                  readyState: audioTrack.readyState,
                  enabled: audioTrack.enabled,
                  muted: audioTrack.muted,
                  settings,
                  constraints,
                  capabilities
                });
              }, 5000); // Check every 5 seconds

              // Clean up monitor on track end
              audioTrack.addEventListener('ended', () => {
                clearInterval(trackStateMonitor);
                if (testAudio.parentNode) {
                  testAudio.parentNode.removeChild(testAudio);
                }
              });

              console.log('Captured macOS system audio via AudioTee', {
                id: audioTrack.id,
                label: audioTrack.label,
                enabled: audioTrack.enabled,
                muted: audioTrack.muted,
                readyState: audioTrack.readyState,
                kind: audioTrack.kind,
                testAudioElement: testAudio
              });

              // Add a way to test audio - expose it globally for debugging
              (window as any).testMacOSAudio = {
                audioStream,
                audioTrack,
                audioContext,
                testAudio,
                stop: () => {
                  clearInterval(trackStateMonitor);
                  testAudio.pause();
                  if (testAudio.parentNode) {
                    testAudio.parentNode.removeChild(testAudio);
                  }
                },
                play: () => {
                  testAudio.play().catch(console.error);
                },
                pause: () => {
                  testAudio.pause();
                }
              };

              console.log('Test audio controls available at window.testMacOSAudio');

              return audioStream;
            }

            console.error('No audio track in MediaStream from destination');
            return null;
          } catch (err) {
            console.error('Failed to capture macOS system audio via AudioTee:', err);
            // Try fallback to getUserMedia
            try {
              const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  mandatory: {
                    chromeMediaSource: 'desktop'
                  }
                } as any
              });
              const audioTrack = audioStream.getAudioTracks()[0];
              if (audioTrack) {
                audioTrack.addEventListener('ended', onTrackEnd);
                return audioStream;
              }
            } catch (fallbackErr) {
              console.warn('Fallback audio capture also failed:', fallbackErr);
            }
            return null;
          }
        };

        // On macOS, use tracks directly from system picker
        // On Windows/Linux, get video stream from selected source
        let videoTrack: MediaStreamTrack;
        let videoStream: MediaStream;

        if (isMacOS && systemDisplayStream) {
          // Use the video track from system picker
          videoStream = systemDisplayStream;
          videoTrack = (systemDisplayStream as any).getVideoTracks()[0];

          if (!videoTrack) {
            throw new Error('No video track available from system picker');
          }
        } else {
          // Get video stream from selected source (Windows/Linux)
          videoStream = await getVideoStream(choice.id);
          videoTrack = videoStream.getVideoTracks()[0];

          if (!videoTrack) {
            throw new Error('No video track available');
          }
        }

        // Apply content hint
        if (choice.contentHint) {
          videoTrack.contentHint = choice.contentHint;
        }

        // Setup cleanup handler
        const audioStreams: MediaStream[] = [];
        const handleTrackEnd = async () => {
          await localParticipant.setScreenShareEnabled(false);

          // Stop virtual mic on Linux
          if (isLinux && window.CrystalNative) {
            try {
              await window.CrystalNative.audio.stopCapture();
            } catch (err) {
              console.warn('Failed to stop audio capture:', err);
            }
          }

          // Stop all tracks
          videoStream.getTracks().forEach(track => track.stop());
          audioStreams.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
          });
        };

        videoTrack.addEventListener('ended', handleTrackEnd);

        // Publish video track
        await localParticipant.publishTrack(videoTrack, {
          source: Track.Source.ScreenShare,
          simulcast: true
        });

        // Capture and publish audio based on platform
        if (isLinux && (choice.audio || (choice.includeSources && choice.includeSources !== "None"))) {
          // Linux: Try native PipeWire first, then fall back to virtual mic (pw-cli / pw-loopback)
          const audioStream = await captureLinuxAudio(
            choice.includeSources,
            choice.excludeSources,
            choice.id,
            handleTrackEnd
          );

          if (audioStream) {
            audioStreams.push(audioStream);
            const audioTrack = audioStream.getAudioTracks()[0];
            if (audioTrack) {
              await localParticipant.publishTrack(audioTrack, {
                source: Track.Source.ScreenShareAudio
              });
              console.log('Published Linux system audio');
            }
          }
        } else if (choice.audio && isWindows) {
          // Windows: Use native loopback audio
          const audioStream = await captureWindowsAudio(choice.id, handleTrackEnd);

          if (audioStream) {
            audioStreams.push(audioStream);
            const audioTrack = audioStream.getAudioTracks()[0];
            if (audioTrack) {
              await localParticipant.publishTrack(audioTrack, {
                source: Track.Source.ScreenShareAudio
              });
              console.log('Published Windows system audio via loopback');
            }
          }
        } else if (choice.audio && isMacOS) {
          // macOS: Use audio tracks directly from system picker
          if (systemDisplayStream) {
            const audioTracks = (systemDisplayStream as any).getAudioTracks();
            if (audioTracks.length > 0) {
              // Create separate audio stream from system picker tracks
              const audioStream = new MediaStream(audioTracks);
              audioTracks[0].addEventListener('ended', handleTrackEnd);
              audioStreams.push(audioStream);

              const audioTrack = audioStream.getAudioTracks()[0];
              if (audioTrack) {
                await localParticipant.publishTrack(audioTrack, {
                  source: Track.Source.ScreenShareAudio
                });
                console.log('Published macOS system audio from system picker');
              }
            } else {
              // Fallback to native loopback if no audio in system picker
              const audioStream = await captureMacOSAudio(choice.id, handleTrackEnd);
              if (audioStream) {
                audioStreams.push(audioStream);
                const audioTrack = audioStream.getAudioTracks()[0];
                if (audioTrack) {
                  await localParticipant.publishTrack(audioTrack, {
                    source: Track.Source.ScreenShareAudio
                  });
                  console.log('Published macOS system audio via Electron loopback');
                }
              }
            }
          } else {
            // Fallback to native loopback if system picker wasn't used
            const audioStream = await captureMacOSAudio(choice.id, handleTrackEnd);
            if (audioStream) {
              audioStreams.push(audioStream);
              const audioTrack = audioStream.getAudioTracks()[0];
              if (audioTrack) {
                await localParticipant.publishTrack(audioTrack, {
                  source: Track.Source.ScreenShareAudio
                });
                console.log('Published macOS system audio via Electron loopback');
              }
            }
          }
        }
      } catch (err) {
        if (err === 'Aborted') {
          console.log('User cancelled screen share');
          return;
        }

        // If Electron picker fails, fall back to browser getDisplayMedia
        console.warn('Crystal Electron screen share picker failed, falling back to browser getDisplayMedia:', err);
        await localParticipant.setScreenShareEnabled(true);
      }
    } else if (typeof window !== 'undefined' && window.VesktopNative) {
      // Fallback to Vesktop if available
      try {
        const choice = await window.VesktopNative.screenShare.openPickerWindow(false);
        if (!choice) return;

        // Use existing Vesktop implementation as fallback
        // (Keep existing Vesktop code here as fallback)
        await localParticipant.setScreenShareEnabled(true, {
          audio: true
        });
      } catch (err) {
        console.warn('Vesktop fallback also failed:', err);
        await localParticipant.setScreenShareEnabled(true);
      }
    } else {
      // Not in Electron - use browser's getDisplayMedia
      await localParticipant.setScreenShareEnabled(true, {
        audio: true
      });
    }
  };

  const disconnectCall = async () => {
    const call_disconnect = new Audio("/sounds/call-disconnect.ogg");
    call_disconnect.play();
    livekit.leave();
  };

  const participants = useMemo(
    () => [localParticipant, ...remoteParticipants],
    [localParticipant, remoteParticipants]
  );

  // All published tracks
  const allTracks = useTracks([
    Track.Source.Camera,
    Track.Source.Microphone,
    Track.Source.ScreenShare,
    Track.Source.ScreenShareAudio,
  ]);

  // Initialize default screenshare volumes to 0.5 (only once per track)
  useEffect(() => {
    const screenshareTracks = allTracks.filter(
      (t) => t.publication.source === Track.Source.ScreenShare
    );
    setScreenshareVolumes((prev) => {
      let updated = false;
      const newVolumes = { ...prev };
      screenshareTracks.forEach((track) => {
        const trackSid = track.publication.trackSid;
        // Only set default if not already set (don't overwrite user changes)
        if (newVolumes[trackSid] === undefined) {
          newVolumes[trackSid] = 0.5;
          updated = true;
        }
      });
      return updated ? newVolumes : prev;
    });
  }, [allTracks]);

  // Sync screenshare volume changes to audio elements
  useEffect(() => {
    Object.entries(screenshareVolumes).forEach(([trackSid, volume]) => {
      const audioEl = audioElementRefs.current[`screenshare-${trackSid}`];
      if (audioEl) {
        // Find the track to check if it's local
        const track = allTracks.find(
          (t) => t.publication.trackSid === trackSid && t.publication.source === Track.Source.ScreenShare
        );
        const isLocalScreenshare = track?.participant.identity === localParticipant.identity;
        // Clamp volume between 0 and 0.5
        const clampedVolume = Math.max(0, Math.min(0.5, volume));
        // Set volume (0 to 0.5 range)
        audioEl.volume = clampedVolume;
        // Mute if volume is 0 OR if it's local screenshare
        audioEl.muted = clampedVolume === 0 || isLocalScreenshare;
      }
    });
  }, [screenshareVolumes, allTracks, localParticipant]);

  // Clean up subscriptions when screenshares end
  useEffect(() => {
    const currentScreenshareTrackSids = new Set(
      allTracks
        .filter((t) => t.publication.source === Track.Source.ScreenShare)
        .map((t) => t.publication.trackSid)
    );

    setSubscribedScreenshares((prev) => {
      const newSet = new Set(prev);
      let changed = false;
      prev.forEach((trackSid) => {
        if (!currentScreenshareTrackSids.has(trackSid)) {
          newSet.delete(trackSid);
          changed = true;
        }
      });
      return changed ? newSet : prev;
    });
  }, [allTracks]);

  // Filter for screen shares only
  const screenShareTracks = allTracks
    .filter((t) => t.publication.source === Track.Source.ScreenShare)
    .map((t) => t.participant.identity);

  const videoTracks = allTracks
    .filter((t) => t.publication.source === Track.Source.Camera)
    .map((t) => t.participant.identity);

  // Gallery variables for fallback grid view (computed outside JSX to avoid IIFE)
  // DEV: allow overriding cards via `?mockCards=N` query param for local visual QA only
  const mockCardsFromQuery = (() => {
    if (typeof window === 'undefined') return [] as { type: 'participant' | 'screenshare'; data: any }[];
    const n = Number(new URLSearchParams(window.location.search).get('mockCards') || 0);
    if (!n || n <= 0) return [] as { type: 'participant' | 'screenshare'; data: any }[];
    const arr: { type: 'participant' | 'screenshare'; data: any }[] = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        type: 'participant',
        data: {
          identity: `mock-${i}`,
          name: `Mock ${i + 1}`,
          metadata: JSON.stringify({}),
          isSpeaking: false,
          isMicrophoneEnabled: true,
        },
      });
    }
    return arr;
  })();

  const allCards = [
    ...participants.map((p) => ({ type: 'participant' as const, data: p })),
    ...allTracks
      .filter((t) => t.publication.source === Track.Source.ScreenShare)
      .map((t) => ({ type: 'screenshare' as const, data: t })),
    // Append mock cards in dev when requested via query param
    ...mockCardsFromQuery,
  ];
  const totalCards = allCards.length;
  const gridLayout = calculateGridLayout(totalCards);
  const itemsPerPage = gridLayout.layout === 'asymmetric' && totalCards === 3 ? 3 : gridLayout.cols * gridLayout.rows;
  const totalPages = Math.max(1, Math.ceil(totalCards / (itemsPerPage || 1)));
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCards);
  const currentPageCards = allCards.slice(startIndex, endIndex);

  // Helper to render a card (participant or screenshare) to avoid complex IIFE JSX
  const renderCard = (card?: { type: 'participant' | 'screenshare'; data: any }) => {
    if (!card) return null;

    if (card.type === 'participant') {
      const participant = card.data as any;
      const metadata = safeParseMetadata(participant.metadata);
      const avatar = metadata?.avatar ?? "/default-avatar.png";
      const name = participant.name || participant.identity;
      const speaking = participant.isSpeaking;
      const volume = userVolumes[participant.identity] ?? 1.0;
      const cameraTrack = allTracks.find(
        (t) =>
          t.participant.identity === participant.identity &&
          t.publication.source === Track.Source.Camera &&
          !t.publication.isMuted
      );
      const micTrack = allTracks.find(
        (t) =>
          t.participant.identity === participant.identity &&
          t.publication.source === Track.Source.Microphone &&
          !t.publication.isMuted
      );

      return (
        <div
          className={cn(
            "relative overflow-hidden border-1 bg-background cursor-pointer transition-all duration-200 ease-in-out group w-full h-full",
            speaking ? "border-green-500 shadow-md shadow-green-500/30" : "border-white dark:border-zinc-800"
          )}
          onClick={() => {
            setActiveParticipant(participant);
            setActiveScreenShare(null);
          }}
        >
          {cameraTrack ? (
            <VideoRenderer trackRef={cameraTrack} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-background">
              <img src={avatar} alt={name} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-full transition-all duration-200" />
            </div>
          )}

          {micTrack && micTrack.publication.track?.kind === "audio" && (
            <UserAudioElement
              track={micTrack}
              participantId={participant.identity}
              volume={volume}
              isLocalParticipant={participant.identity === localParticipant.identity}
              audioElementRefs={audioElementRefs}
              userVolumes={userVolumes}
            />
          )}

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/70 p-1 flex flex-col items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  const newVolume = Math.min(1, volume + 0.05);
                  setUserVolume(participant.identity, newVolume);
                }}
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
              <span className="text-xs text-white min-w-[2rem] text-center">{Math.round(volume * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  const newVolume = Math.max(0, volume - 0.05);
                  setUserVolume(participant.identity, newVolume);
                }}
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1">
            <div className="flex items-center gap-1">
              {!participant.isMicrophoneEnabled ? <MicOff className="w-4 h-4 flex-shrink-0" /> : null}
              <span className="text-sm truncate">{name}</span>
            </div>
          </div>
        </div>
      );
    }

    // Screenshare card
    const track = card.data as any;
    const isSubscribed = subscribedScreenshares.has(track.publication.trackSid);
    const volume = screenshareVolumes[track.publication.trackSid] ?? 0.5;
    const isLocalScreenshare = track.participant.identity === localParticipant.identity;
    const screenshareAudioTrack = allTracks.find(
      (t) => t.publication.source === Track.Source.ScreenShareAudio && t.participant.identity === track.participant.identity
    );

    return (
      <div
        className={cn(
          "relative overflow-hidden border-1 border-blue-500 shadow-md cursor-pointer bg-background transition-all duration-200 ease-in-out group",
          "w-full h-full"
        )}
        onClick={() => {
          if (isSubscribed) {
            setActiveScreenShare(track);
            setActiveParticipant(null);
          }
        }}
      >
        {isSubscribed ? (
          <>
            <TrackRefVideoCard trackRef={track} />
            {screenshareAudioTrack && screenshareAudioTrack.publication.track?.kind === "audio" && !isLocalScreenshare && (
              <ScreenshareAudioElement
                track={screenshareAudioTrack}
                trackSid={track.publication.trackSid}
                volume={volume}
                isLocalScreenshare={isLocalScreenshare}
                audioElementRefs={audioElementRefs}
                screenshareVolumes={screenshareVolumes}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-background/80">
            <MonitorUp className="w-12 h-12 text-blue-500 mb-2" />
            <Button
              onClick={(e) => {
                e.stopPropagation();
                subscribeToScreenshare(track.publication.trackSid);
              }}
              className="mt-2"
            >
              View Screenshare
            </Button>
          </div>
        )}

        {isSubscribed && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/70 p-1 flex flex-col items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  const newVolume = Math.min(0.5, volume + 0.05);
                  setScreenshareVolume(track.publication.trackSid, newVolume);
                }}
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
              <span className="text-xs text-white min-w-[2rem] text-center">{Math.round(volume * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  const newVolume = Math.max(0, volume - 0.05);
                  setScreenshareVolume(track.publication.trackSid, newVolume);
                }}
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1">
          <div className="flex items-center gap-1">
            <MonitorUp className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm truncate">{track.participant.name || track.participant.identity} <Badge variant="destructive">LIVE</Badge></span>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="w-full h-screen bg-background bg-cover bg-center">
      <ChatHeader
        name={channel.name}
        serverId={server?.id}
        type={server ? "channel" : "conversation"}
      />
      {livekit.connected && (
        <div className="w-full h-full flex flex-col">
          <div className="w-full h-fit border-t border-border bg-background/90 backdrop-blur-sm shadow-xl z-50">
            <div className="flex flex-row items-center justify-center">
              <div className="flex flex-row items-center gap-1 sm:gap-2 lg:gap-3 justify-center p-2 sm:p-3 lg:p-4">
                {/* Microphone Controls - Responsive */}
                <div className="flex group hover:bg-muted/50 rounded-lg flex-row items-center gap-0.5 transition-colors">
                  {localParticipant.isMicrophoneEnabled ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 sm:p-2 rounded-none group-hover:bg-muted rounded-l-lg"
                      onClick={() => {
                        const mute = new Audio("/sounds/mute.ogg");
                        mute.play();
                        localParticipant.setMicrophoneEnabled(
                          !localParticipant.isMicrophoneEnabled
                        );
                      }}
                    >
                      <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-none rounded-l-lg"
                      onClick={() => {
                        const unmute = new Audio("/sounds/unmute.ogg");
                        unmute.play();
                        localParticipant.setMicrophoneEnabled(
                          !localParticipant.isMicrophoneEnabled
                        );
                      }}
                    >
                      <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  )}
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5 sm:p-2 rounded-none group-hover:bg-muted rounded-r-lg"
                      >
                        <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0">
                      <div className="p-2">
                        <PopoverTitle className="text-sm font-medium">Microphone</PopoverTitle>
                      </div>
                      <Separator />
                      <div className="p-1">
                        {inputDevices.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No microphones found
                          </div>
                        ) : (
                          inputDevices.map((device, index) => {
                            const isActive = activeInputDeviceId === device.deviceId ||
                              (!activeInputDeviceId && index === 0 && inputDevices.length > 0);
                            return (
                              <button
                                key={`input-${device.deviceId}-${index}`}
                                onClick={() => {
                                  handleSelectInput(device.deviceId);
                                }}
                                className="w-full flex items-center justify-between text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                              >
                                <span>{device.label || "Default Microphone"}</span>
                                {isActive && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                      <Separator />
                      <div className="p-2">
                        <PopoverTitle className="text-sm font-medium">Speaker</PopoverTitle>
                      </div>
                      <Separator />
                      <div className="p-1">
                        {outputDevices.map((device, index) => (
                          <button
                            key={`output-${device.deviceId}-${index}`}
                            onClick={() => {
                              handleSelectOutput(device.deviceId);
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            {device.label || "Default Speaker"}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Camera Controls - Responsive */}
                <div className="flex group hover:bg-muted/50 rounded-lg flex-row items-center gap-0.5 transition-colors">
                  {localParticipant.isCameraEnabled ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 sm:p-2 rounded-none group-hover:bg-muted rounded-l-lg"
                      onClick={() => {
                        const mute = new Audio("/sounds/mute.ogg");
                        mute.play();
                        localParticipant.setCameraEnabled(
                          !localParticipant.isCameraEnabled
                        );
                      }}
                    >
                      <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-none rounded-l-lg"
                      onClick={() => {
                        const unmute = new Audio("/sounds/unmute.ogg");
                        unmute.play();
                        localParticipant.setCameraEnabled(
                          !localParticipant.isCameraEnabled
                        );
                      }}
                    >
                      <CameraOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  )}
                  <Popover open={cameraPopoverOpen} onOpenChange={setCameraPopoverOpen}>
                    <PopoverTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5 sm:p-2 rounded-none group-hover:bg-muted rounded-r-lg"
                      >
                        <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0">
                      <div className="p-2">
                        <PopoverTitle className="text-sm font-medium">Camera</PopoverTitle>
                      </div>
                      <Separator />
                      <div className="p-1">
                        {cameraDevices.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No cameras found
                          </div>
                        ) : (
                          cameraDevices.map((device, index) => {
                            const isActive = activeCameraDeviceId === device.deviceId ||
                              (!activeCameraDeviceId && index === 0 && cameraDevices.length > 0);
                            return (
                              <button
                                key={`camera-${device.deviceId}-${index}`}
                                onClick={() => {
                                  handleSelectCamera(device.deviceId);
                                  setCameraPopoverOpen(false);
                                }}
                                className="w-full flex items-center justify-between text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                              >
                                <span>{device.label || `Camera ${index + 1}`}</span>
                                {isActive && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Screen Share Button - Responsive */}
                {localParticipant.isScreenShareEnabled ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="p-1.5 sm:p-2 bg-red-500 hover:bg-red-600"
                    onClick={() => {
                      toggleScreenShare();
                    }}
                  >
                    <MonitorDown className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="p-1.5 sm:p-2"
                    onClick={() => {
                      toggleScreenShare();
                    }}
                  >
                    <MonitorUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                )}

                {/* Disconnect Button - Responsive */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1.5 sm:p-2 hover:bg-red-500/20"
                  onClick={disconnectCall}
                >
                  <Phone
                    className={cn(
                      "h-4 w-4 sm:h-5 sm:w-5 text-red-400 rotate-[135deg]"
                    )}
                  />
                </Button>
              </div>
            </div>
          </div>
          {(activeParticipant || activeScreenShare) && (
            <div className={`w-full sm:h-[115vmin] md:h-[205vmin] lg:h-[285vmin] transition-all duration-300 ease-in-out`}>
              {activeParticipant && (
                <div className="relative w-full h-full overflow-hidden border border-border">
                  <ActiveParticipantCard
                    setActiveParticipant={setActiveParticipant}
                    setActiveScreenShare={setActiveScreenShare}
                    participant={activeParticipant}
                    allTracks={allTracks}
                    userVolumes={userVolumes}
                    setUserVolume={setUserVolume}
                    audioElementRefs={audioElementRefs}
                    localParticipant={localParticipant}
                  />
                </div>
              )}

              {activeScreenShare && (
                <div className="relative w-full sm:h-[48vmin] md:h-[64vmin] lg:h-[69vmin] overflow-hidden border border-border">
                  <div
                    className="w-full h-full cursor-pointer"
                    onClick={() => {
                      setActiveParticipant(null);
                      setActiveScreenShare(null);
                    }}
                  >
                    <VideoRenderer trackRef={activeScreenShare} />
                    {/* Add audio renderer for screen share audio - separate from mic, muted for local screensharer */}
                    {allTracks
                      .filter(track =>
                        track.publication.source === Track.Source.ScreenShareAudio &&
                        track.participant.identity === activeScreenShare.participant.identity
                      )
                      .map(track => {
                        const isLocalScreenshare = track.participant.identity === localParticipant.identity;
                        const trackSid = activeScreenShare.publication.trackSid;
                        const currentVolume = screenshareVolumes[trackSid] ?? 0.5;
                        return (
                          <ScreenshareAudioElement
                            key={track.publication.trackSid}
                            track={track}
                            trackSid={trackSid}
                            volume={currentVolume}
                            isLocalScreenshare={isLocalScreenshare}
                            audioElementRefs={audioElementRefs}
                            screenshareVolumes={screenshareVolumes}
                          />
                        );
                      })}
                    <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-black bg-opacity-50 text-white px-2 sm:px-3 py-1 sm:py-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-lg">
                          {activeScreenShare.participant.name ||
                            activeScreenShare.participant.identity}{" "}
                          <Badge variant="destructive">LIVE</Badge>
                        </span>
                      </div>
                    </div>
                    {/* Volume control for active screenshare */}
                    <div className="absolute top-2 right-2 bg-black/70 p-2 flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentVolume = screenshareVolumes[activeScreenShare.publication.trackSid] ?? 0.5;
                          const newVolume = Math.min(0.5, currentVolume + 0.05);
                          setScreenshareVolume(activeScreenShare.publication.trackSid, newVolume);
                        }}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-white font-medium min-w-[3rem] text-center">
                        {Math.round((screenshareVolumes[activeScreenShare.publication.trackSid] ?? 0.5) * 100)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentVolume = screenshareVolumes[activeScreenShare.publication.trackSid] ?? 0.5;
                          const newVolume = Math.max(0, currentVolume - 0.05);
                          setScreenshareVolume(activeScreenShare.publication.trackSid, newVolume);
                        }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="h-full">
            {activeParticipant || activeScreenShare ? (
              // Horizontal scroll when active view exists
              <div className="h-fit overflow-x-auto overflow-y-hidden mb-8">
                <div className="flex w-max items-center justify-center min-h-0 min-w-full">
                  {/* Participant Cards - Smaller on mobile */}
                  {participants.map((participant) => {
                    const metadata = safeParseMetadata(
                      participant.metadata
                    );
                    const avatar =
                      metadata?.avatar ?? "/default-avatar.png";
                    const name = participant.name || participant.identity;
                    const speaking = participant.isSpeaking;
                    const isActive =
                      activeParticipant?.identity === participant.identity;

                    // Find camera track if published
                    const cameraTrack = allTracks.find(
                      (t) =>
                        t.participant.identity === participant.identity &&
                        t.publication.source === Track.Source.Camera &&
                        !t.publication.isMuted
                    );

                    return (
                      <div
                        key={participant.identity}
                        className={cn(
                          "relative overflow-hidden p-1 border-1 bg-background cursor-pointer flex-shrink-0 transition-all duration-200 ease-in-out",
                          // Responsive sizing - much smaller on mobile
                          "w-32 h-20 sm:w-40 sm:h-24 lg:w-48 lg:h-32",
                          speaking
                            ? "border-green-500 shadow-md shadow-green-500/30"
                            : "border-white dark:border-zinc-800",
                          isActive && "opacity-60"
                        )}
                        onClick={() => {
                          if (isActive) {
                            setActiveParticipant(null);
                          } else {
                            setActiveParticipant(participant);
                            setActiveScreenShare(null);
                          }
                        }}
                      >
                        {cameraTrack ? (
                          <VideoRenderer trackRef={cameraTrack} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-background">
                            <img
                              src={avatar}
                              alt={name}
                              className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 object-cover rounded-full transition-all duration-200"
                            />
                          </div>
                        )}

                        {/* Active Participant Indicator - Responsive */}
                        {isActive && (
                          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-blue-500 text-white p-0.5 sm:p-1.5 rounded-full">
                            <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                        )}

                        <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black bg-opacity-50 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded">
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            {!participant.isMicrophoneEnabled ? (
                              <MicOff className="w-2 h-2 sm:w-3 sm:h-3 flex-shrink-0" />
                            ) : null}
                            <span className="text-xs truncate">
                              {name}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Screen Share Cards - Responsive */}
                  {allTracks
                    .filter(
                      (t) =>
                        t.publication.source === Track.Source.ScreenShare
                    )
                    .map((track) => {
                      const isActiveScreenShare =
                        activeScreenShare?.publication.trackSid ===
                        track.publication.trackSid;
                      const isSubscribed = subscribedScreenshares.has(track.publication.trackSid);
                      const isLocalScreenshare = track.participant.identity === localParticipant.identity;

                      return (
                        <div
                          key={`screenshare-${track.publication.trackSid}`}
                          onClick={() => {
                            if (!isSubscribed) {
                              subscribeToScreenshare(track.publication.trackSid);
                            } else if (isActiveScreenShare) {
                              setActiveScreenShare(null);
                            } else {
                              setActiveScreenShare(track);
                              setActiveParticipant(null);
                            }
                          }}
                          className={cn(
                            "overflow-hidden border-2 border-blue-500 shadow-md cursor-pointer relative bg-background flex-shrink-0 transition-all duration-200 ease-in-out",
                            "w-32 h-20 sm:w-40 sm:h-24 lg:w-48 lg:h-32",
                            isActiveScreenShare && "opacity-60"
                          )}
                        >
                          {isSubscribed ? (
                            <>
                              <TrackRefVideoCard trackRef={track} />
                              {/* Audio for screenshare (muted for local) */}
                              {allTracks
                                .filter(t =>
                                  t.publication.source === Track.Source.ScreenShareAudio &&
                                  t.participant.identity === track.participant.identity
                                )
                                .map(audioTrack => {
                                  const trackSid = track.publication.trackSid;
                                  const currentVolume = screenshareVolumes[trackSid] ?? 0.5;
                                  return (
                                    <ScreenshareAudioElement
                                      key={audioTrack.publication.trackSid}
                                      track={audioTrack}
                                      trackSid={trackSid}
                                      volume={currentVolume}
                                      isLocalScreenshare={isLocalScreenshare}
                                      audioElementRefs={audioElementRefs}
                                      screenshareVolumes={screenshareVolumes}
                                    />
                                  );
                                })}
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-background/80">
                              <MonitorUp className="w-6 h-6 text-blue-500 mb-1" />
                              <span className="text-xs text-center px-1">Click to view</span>
                            </div>
                          )}

                          {/* Active Screen Share Indicator - Responsive */}
                          {isActiveScreenShare && (
                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-blue-500 text-white p-0.5 sm:p-1.5 rounded-full">
                              <MonitorUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            </div>
                          )}

                          <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black bg-opacity-50 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded">
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <MonitorUp className="w-2 h-2 sm:w-3 sm:h-3 flex-shrink-0" />
                              <span className="text-xs truncate hidden sm:inline">
                                {track.participant.name ||
                                  track.participant.identity}{" "}
                                <Badge variant="destructive">LIVE</Badge>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              // Gallery grid layout with pagination
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden h-full flex flex-col">

                  {gridLayout.layout === 'asymmetric' && totalCards === 3 ? (
                    <div className="grid grid-cols-2 grid-rows-2 h-[calc(100vh - 220px)] flex-1" style={{ gridTemplateRows: 'repeat(2, calc(100vh / 2)' }}>
                      <div className="col-span-1 row-span-2 w-full h-full">
                        {renderCard(currentPageCards[0])}
                      </div>
                      <div className="col-span-1 row-span-1 w-full h-full">
                        {renderCard(currentPageCards[1])}
                      </div>
                      <div className="col-span-1 row-span-1 w-full h-full">
                        {renderCard(currentPageCards[2])}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="grid flex-1 h-[calc(100vh-220px)]"
                      style={{
                        gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`,
                      }}
                    >
                      {currentPageCards.map((card, i) => (
                        <div key={i} className="w-full sm:h-[67.6vmin] md:h-[76.5vmin] lg:h-[82.6vmin]">
                          {renderCard(card)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!livekit.connected && (
        <div className="flex flex-col items-center justify-center w-full h-full px-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-black dark:text-white text-center">
            {channel.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Not connected. Click to join.</p>
          <Button
            className="mt-4 w-full max-w-xs"
            onClick={() => {
              livekit.join(
                channel.id,
                channel.name,
                server?.name as string,
                server?.id as string,
                "channel",
                true,
                false
              );
            }}
          >
            Join channel
          </Button>
        </div>
      )}
    </div>
  );
};

// Update VideoRenderer to use full container size
function VideoRenderer({ trackRef }: { trackRef: TrackReference }) {
  return (
    <video
      ref={(el) => {
        if (el && trackRef.publication.track?.kind === "video") {
          trackRef.publication.track.attach(el);
        }
      }}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-contain rounded-lg" // Changed to use full container
    />
  );
}

// Update TrackRefVideoCard for screen shares
function TrackRefVideoCard({ trackRef }: { trackRef: TrackReference }) {
  return (
    <TrackRefContext.Provider value={trackRef}>
      <div className="w-full h-full relative">
        <video
          ref={(el) => {
            if (el && trackRef.publication.track?.kind === "video") {
              trackRef.publication.track.attach(el);
            }
          }}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
    </TrackRefContext.Provider>
  );
}

// Update ActiveParticipantCard component
function ActiveParticipantCard({
  participant,
  allTracks,
  setActiveParticipant,
  setActiveScreenShare,
  userVolumes,
  setUserVolume,
  audioElementRefs,
  localParticipant,
}: {
  participant: any;
  allTracks: TrackReference[];
  setActiveParticipant: (participant: any) => void;
  setActiveScreenShare: (trackRef: TrackReference | null) => void;
  userVolumes: Record<string, number>;
  setUserVolume: (participantId: string, volume: number) => void;
  audioElementRefs: React.MutableRefObject<Record<string, HTMLAudioElement>>;
  localParticipant: any;
}) {
  const metadata = safeParseMetadata(participant.metadata);
  const avatar = metadata?.avatar ?? "/default-avatar.png";
  const name = participant.name || participant.identity;
  const speaking = participant.isSpeaking;
  const volume = userVolumes[participant.identity] ?? 1.0;

  // Find camera track if published
  const cameraTrack = allTracks.find(
    (t) =>
      t.participant.identity === participant.identity &&
      t.publication.source === Track.Source.Camera &&
      !t.publication.isMuted
  );

  const micTrack = allTracks.find(
    (t) =>
      t.participant.identity === participant.identity &&
      t.publication.source === Track.Source.Microphone &&
      !t.publication.isMuted
  );

  return (
    <div
      className={cn(
        "w-full h-full relative cursor-pointer transition-all group",
        speaking ? "ring-2 ring-green-500" : "ring-2 ring-border"
      )}
      onClick={() => {
        setActiveParticipant(null);
        setActiveScreenShare(null);
      }}
    >
      {cameraTrack ? (
        <VideoRenderer trackRef={cameraTrack} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-background">
          <img
            src={avatar}
            alt={name}
            className="w-32 h-32 object-cover rounded-full"
          />
        </div>
      )}

      {/* Attach mic audio element so volume changes apply */}
      {micTrack && micTrack.publication.track?.kind === "audio" && (
        <UserAudioElement
          track={micTrack}
          participantId={participant.identity}
          volume={volume}
          isLocalParticipant={participant.identity === localParticipant.identity}
          audioElementRefs={audioElementRefs}
          userVolumes={userVolumes}
        />
      )}

      {/* Volume controls (top-right) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/70 p-1 flex flex-col items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              const newVolume = Math.min(1, volume + 0.05);
              setUserVolume(participant.identity, newVolume);
            }}
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <span className="text-xs text-white min-w-[2rem] text-center">{Math.round(volume * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              const newVolume = Math.max(0, volume - 0.05);
              setUserVolume(participant.identity, newVolume);
            }}
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
        <div className="flex items-center gap-2">
          {!participant.isMicrophoneEnabled && <MicOff className="w-4 h-4" />}
          <span className="text-sm font-medium">{name}</span>
        </div>
      </div>
    </div>
  );
}

// User Audio Element Component - handles volume updates properly
function UserAudioElement({
  track,
  participantId,
  volume,
  isLocalParticipant,
  audioElementRefs,
  userVolumes,
}: {
  track: TrackReference;
  participantId: string;
  volume: number;
  isLocalParticipant: boolean;
  audioElementRefs: React.MutableRefObject<Record<string, HTMLAudioElement>>;
  userVolumes: Record<string, number>;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Always read current volume from state
  const currentVolume = userVolumes[participantId] ?? volume;
  const clampedVolume = Math.max(0, Math.min(1, currentVolume));

  // Update volume whenever userVolumes changes - ALWAYS mute local participants
  useEffect(() => {
    if (audioRef.current) {
      const latestVolume = userVolumes[participantId] ?? volume;
      const latestClamped = Math.max(0, Math.min(1, latestVolume));
      audioRef.current.volume = latestClamped;
      // ALWAYS mute local participants, regardless of volume
      audioRef.current.muted = isLocalParticipant || latestClamped === 0;
    }
  }, [userVolumes, participantId, volume, isLocalParticipant]);

  // Enforce muted state on mount and whenever isLocalParticipant changes
  useEffect(() => {
    if (audioRef.current && isLocalParticipant) {
      audioRef.current.muted = true;
    }
  }, [isLocalParticipant]);

  return (
    <audio
      ref={(el) => {
        audioRef.current = el;
        if (el && track.publication.track) {
          track.publication.track.attach(el);
          audioElementRefs.current[`user-${participantId}`] = el;
          // Set initial volume
          el.volume = clampedVolume;
          // ALWAYS mute local participants immediately
          el.muted = isLocalParticipant || clampedVolume === 0;
        }
      }}
      autoPlay
      playsInline
      muted={isLocalParticipant}
    />
  );
}

// Screenshare Audio Element Component - handles volume updates properly
function ScreenshareAudioElement({
  track,
  trackSid,
  volume,
  isLocalScreenshare,
  audioElementRefs,
  screenshareVolumes,
}: {
  track: TrackReference;
  trackSid: string;
  volume: number;
  isLocalScreenshare: boolean;
  audioElementRefs: React.MutableRefObject<Record<string, HTMLAudioElement>>;
  screenshareVolumes: Record<string, number>;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Always read current volume from state
  const currentVolume = screenshareVolumes[trackSid] ?? volume;
  const clampedVolume = Math.max(0, Math.min(0.5, currentVolume));

  // Update volume whenever screenshareVolumes changes
  useEffect(() => {
    if (audioRef.current) {
      const latestVolume = screenshareVolumes[trackSid] ?? volume;
      const latestClamped = Math.max(0, Math.min(0.5, latestVolume));
      audioRef.current.volume = latestClamped;
      audioRef.current.muted = latestClamped === 0 || isLocalScreenshare;
    }
  }, [screenshareVolumes, trackSid, volume, isLocalScreenshare]);

  return (
    <audio
      ref={(el) => {
        audioRef.current = el;
        if (el && track.publication.track) {
          track.publication.track.attach(el);
          audioElementRefs.current[`screenshare-${trackSid}`] = el;
          // Set initial volume
          el.volume = clampedVolume;
          el.muted = clampedVolume === 0 || isLocalScreenshare;
        }
      }}
      autoPlay
      playsInline
      muted={isLocalScreenshare}
    />
  );
}

// Safely parse metadata JSON from participant
function safeParseMetadata(raw?: string): { avatar?: string } | null {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

