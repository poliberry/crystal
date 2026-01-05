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
  useTrackRefContext,
  useTracks,
  VideoConference,
} from "@livekit/components-react";
import { useVirtualAudio } from "@/hooks/use-virtual-audio";
import {
  Camera,
  CameraOff,
  ChevronUp,
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
import { useEffect, useMemo, useState, useRef } from "react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [activeParticipant, setActiveParticipant] = useState<any>(null);
  const [activeScreenShare, setActiveScreenShare] = useState<any>(null);
  const { localParticipant } = useLocalParticipant();
  const { isElectron, virtualDevice, createVirtualMic } = useVirtualAudio();
  const remoteParticipants = useRemoteParticipants();
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  
  // Volume controls state
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({});
  const [screenshareVolumes, setScreenshareVolumes] = useState<Record<string, number>>({});
  
  // Screenshare subscription state (opt-in viewing)
  const [subscribedScreenshares, setSubscribedScreenshares] = useState<Set<string>>(new Set());
  
  // Pagination state for gallery grid
  const [currentPage, setCurrentPage] = useState(0);
  
  // Audio element refs for volume control
  const audioElementRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setInputDevices(devices.filter((d) => d.kind === "audioinput"));
      setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      setCameraDevices(devices.filter((d) => d.kind === "videoinput"));
    });
  }, []);

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
  const calculateGridLayout = (totalItems: number) => {
    if (totalItems === 0) return { cols: 1, rows: 1 };
    if (totalItems === 1) return { cols: 1, rows: 1 };
    if (totalItems === 2) return { cols: 2, rows: 1 };
    if (totalItems <= 4) return { cols: 2, rows: 2 };
    if (totalItems <= 6) return { cols: 3, rows: 2 };
    if (totalItems <= 9) return { cols: 3, rows: 3 };
    if (totalItems <= 12) return { cols: 4, rows: 3 };
    if (totalItems <= 16) return { cols: 4, rows: 4 };
    if (totalItems <= 20) return { cols: 5, rows: 4 };
    if (totalItems <= 25) return { cols: 5, rows: 5 };
    // For more than 25, use pagination with 5x5 grid
    return { cols: 5, rows: 5 };
  };

  // Volume control functions
  const setUserVolume = (participantId: string, volume: number) => {
    setUserVolumes((prev) => ({ ...prev, [participantId]: volume }));
    // Update audio element volume immediately
    const audioEl = audioElementRefs.current[`user-${participantId}`];
    if (audioEl) {
      audioEl.volume = volume;
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
    // Update audio element volume immediately (don't wait for useEffect)
    const audioEl = audioElementRefs.current[`screenshare-${trackSid}`];
    if (audioEl) {
      // Set volume (0 to 0.5 range)
      audioEl.volume = clampedVolume;
      // If volume is 0, mute it (unless it's already muted for being local - preserve that)
      // If volume > 0 and it was muted only because volume was 0, unmute it
      // But if it's muted because it's local, keep it muted
      const wasMutedForVolume = audioEl.volume === 0;
      if (clampedVolume === 0) {
        audioEl.muted = true;
      } else if (wasMutedForVolume) {
        // Only unmute if it was muted for volume, not for being local
        // We'll let the useEffect handle the local check
        audioEl.muted = false;
      }
    }
  };

  // Sync volume changes to audio elements
  useEffect(() => {
    Object.entries(userVolumes).forEach(([participantId, volume]) => {
      const audioEl = audioElementRefs.current[`user-${participantId}`];
      if (audioEl) {
        const isLocalParticipant = participantId === localParticipant.identity;
        audioEl.volume = volume;
        audioEl.muted = isLocalParticipant; // Always mute local participant's own audio
      }
    });
  }, [userVolumes, localParticipant]);

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
    localParticipant.activeDeviceMap.set("audioinput", deviceId);
  };

  const handleSelectOutput = async (deviceId: string) => {
    localParticipant.activeDeviceMap.set("audiooutput", deviceId);
  };

  const handleSelectCamera = async (deviceId: string) => {
    localParticipant.activeDeviceMap.set("videoinput", deviceId);
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
            console.log('Attempting native PipeWire audio capture via getDisplayMedia...');
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
                channelCount: 2
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
          videoTrack = systemDisplayStream.getVideoTracks()[0];
          
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
          // Linux: Try native PipeWire first, then fall back to venmic
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
            const audioTracks = systemDisplayStream.getAudioTracks();
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

  return (
    <div className="w-full h-screen bg-[url('/background-light.png')] dark:bg-[url('/background-dark.png')] bg-cover bg-center">
      <ChatHeader
        name={channel.name}
        serverId={channel.serverId ? channel.serverId : undefined}
        type={channel.serverId ? "channel" : "conversation"}
      />
      {livekit.connected && (
        <>
          {/* Centered Main Content Area - Responsive padding */}
          <div className="flex flex-col items-center justify-start w-full h-full px-2 sm:px-4 lg:px-8 pb-16 sm:pb-20 relative">
            <div className="w-full max-w-6xl h-full flex flex-col">
              {/* Active View Container - Responsive height */}
              {(activeParticipant || activeScreenShare) && (
                <div className="w-full transition-all duration-300 pt-4 sm:pt-6 lg:pt-8 -mb-4 sm:-mb-6 lg:-mb-8 ease-in-out">
                  {activeParticipant && (
                    <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-[28rem] rounded-lg overflow-hidden border-2 bg-background">
                      <ActiveParticipantCard
                        setActiveParticipant={setActiveParticipant}
                        setActiveScreenShare={setActiveScreenShare}
                        participant={activeParticipant}
                        allTracks={allTracks}
                      />
                    </div>
                  )}

                  {activeScreenShare && (
                    <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-[28rem] rounded-lg overflow-hidden border-2 border-blue-500 bg-background">
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
                            return (
                              <audio
                                key={track.publication.trackSid}
                                autoPlay
                                playsInline
                                muted={isLocalScreenshare}
                                ref={el => {
                                  if (el && track.publication.track?.kind === "audio") {
                                    audioElementRefs.current[`screenshare-${trackSid}`] = el;
                                    track.publication.track.attach(el);
                                    // Get current volume from state (not closure)
                                    const currentVolume = screenshareVolumes[trackSid] ?? 0.5;
                                    const clampedVolume = Math.max(0, Math.min(0.5, currentVolume));
                                    el.volume = clampedVolume;
                                    // Mute if volume is 0 OR if it's local screenshare
                                    el.muted = clampedVolume === 0 || isLocalScreenshare;
                                  }
                                }}
                              />
                            );
                          })}
                        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-black bg-opacity-50 text-white px-2 sm:px-3 py-1 sm:py-2 rounded">
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
                        <div className="absolute top-2 right-2 bg-black/70 rounded-lg p-2 flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-white" />
                          <input
                            type="range"
                            min="0"
                            max="0.5"
                            step="0.01"
                            value={screenshareVolumes[activeScreenShare.publication.trackSid] ?? 0.5}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newVolume = parseFloat(e.target.value);
                              setScreenshareVolume(activeScreenShare.publication.trackSid, newVolume);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 h-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Participants Grid - Responsive */}
              <div className="flex-1 overflow-hidden">
                {activeParticipant || activeScreenShare ? (
                  // Horizontal scroll when active view exists - responsive sizing
                  <div className="h-full overflow-x-auto overflow-y-hidden pb-2 sm:pb-4">
                    <div className="flex gap-2 sm:gap-4 w-max h-full items-center justify-center min-h-0 py-2 min-w-full">
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
                              "relative rounded-lg overflow-hidden p-1 border-2 bg-background cursor-pointer flex-shrink-0 transition-all duration-200 ease-in-out",
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
                                "rounded-lg overflow-hidden border-2 border-blue-500 shadow-md cursor-pointer relative bg-background flex-shrink-0 transition-all duration-200 ease-in-out",
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
                                      return (
                                        <audio
                                          key={audioTrack.publication.trackSid}
                                          ref={(el) => {
                                            if (el && audioTrack.publication.track?.kind === "audio") {
                                              audioElementRefs.current[`screenshare-${trackSid}`] = el;
                                              audioTrack.publication.track.attach(el);
                                              // Get current volume from state (not closure)
                                              const currentVolume = screenshareVolumes[trackSid] ?? 0.5;
                                              const clampedVolume = Math.max(0, Math.min(0.5, currentVolume));
                                              el.volume = clampedVolume;
                                              // Mute if volume is 0 OR if it's local screenshare
                                              el.muted = clampedVolume === 0 || isLocalScreenshare;
                                            }
                                          }}
                                          autoPlay
                                          playsInline
                                          muted={isLocalScreenshare}
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
                  (() => {
                    // Combine participants and ALL screenshares (not just subscribed ones)
                    const allCards = [
                      ...participants.map((p) => ({ type: 'participant' as const, data: p })),
                      ...allTracks
                        .filter((t) => t.publication.source === Track.Source.ScreenShare)
                        .map((t) => ({ type: 'screenshare' as const, data: t })),
                    ];

                    const totalCards = allCards.length;
                    const gridLayout = calculateGridLayout(totalCards);
                    const itemsPerPage = gridLayout.cols * gridLayout.rows;
                    const totalPages = Math.ceil(totalCards / itemsPerPage);
                    const startIndex = currentPage * itemsPerPage;
                    const endIndex = Math.min(startIndex + itemsPerPage, totalCards);
                    const currentPageCards = allCards.slice(startIndex, endIndex);

                    return (
                      <div className="h-full flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2 sm:pb-4">
                          <div
                            className="grid gap-2 sm:gap-4 py-2 sm:py-4 px-2 sm:px-4 h-full"
                            style={{
                              gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
                              gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`,
                            }}
                          >
                            {currentPageCards.map((card, index) => {
                              if (card.type === 'participant') {
                                const participant = card.data;
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

                                // Find microphone track for audio
                                const micTrack = allTracks.find(
                                  (t) =>
                                    t.participant.identity === participant.identity &&
                                    t.publication.source === Track.Source.Microphone &&
                                    !t.publication.isMuted
                                );

                                return (
                                  <div
                                    key={participant.identity}
                                    className={cn(
                                      "relative rounded-lg overflow-hidden border-2 bg-background cursor-pointer transition-all duration-200 ease-in-out group",
                                      speaking
                                        ? "border-green-500 shadow-md shadow-green-500/30"
                                        : "border-white dark:border-zinc-800"
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
                                        <img
                                          src={avatar}
                                          alt={name}
                                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-full transition-all duration-200"
                                        />
                                      </div>
                                    )}

                                    {/* Audio element for volume control - muted for local participant */}
                                    {micTrack && micTrack.publication.track?.kind === "audio" && (
                                      <audio
                                        ref={(el) => {
                                          if (el && micTrack.publication.track) {
                                            const isLocalParticipant = participant.identity === localParticipant.identity;
                                            audioElementRefs.current[`user-${participant.identity}`] = el;
                                            micTrack.publication.track.attach(el);
                                            // Set volume after attachment, muted for local participant
                                            el.volume = volume;
                                            el.muted = isLocalParticipant;
                                          }
                                        }}
                                        autoPlay
                                        playsInline
                                        muted={participant.identity === localParticipant.identity}
                                      />
                                    )}

                                    {/* Volume control */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="bg-black/70 rounded-lg p-1 flex items-center gap-1">
                                        <Volume2 className="w-3 h-3 text-white" />
                                        <input
                                          type="range"
                                          min="0"
                                          max="1"
                                          step="0.01"
                                          value={volume}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            setUserVolume(participant.identity, parseFloat(e.target.value));
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-16 h-1"
                                        />
                                      </div>
                                    </div>

                                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                                      <div className="flex items-center gap-1">
                                        {!participant.isMicrophoneEnabled ? (
                                          <MicOff className="w-4 h-4 flex-shrink-0" />
                                        ) : null}
                                        <span className="text-sm truncate">{name}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                const track = card.data;
                                const isSubscribed = subscribedScreenshares.has(track.publication.trackSid);
                                const volume = screenshareVolumes[track.publication.trackSid] ?? 0.5;
                                const isLocalScreenshare = track.participant.identity === localParticipant.identity;

                                // Find screenshare audio track
                                const screenshareAudioTrack = allTracks.find(
                                  (t) =>
                                    t.publication.source === Track.Source.ScreenShareAudio &&
                                    t.participant.identity === track.participant.identity
                                );

                                return (
                                  <div
                                    key={`screenshare-${track.publication.trackSid}`}
                                    className={cn(
                                      "relative rounded-lg overflow-hidden border-2 border-blue-500 shadow-md cursor-pointer bg-background transition-all duration-200 ease-in-out group"
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
                                        {/* Audio element for screenshare audio (separate from mic) */}
                                        {screenshareAudioTrack && screenshareAudioTrack.publication.track?.kind === "audio" && !isLocalScreenshare && (
                                          <audio
                                            ref={(el) => {
                                              if (el && screenshareAudioTrack.publication.track) {
                                                const trackSid = track.publication.trackSid;
                                                audioElementRefs.current[`screenshare-${trackSid}`] = el;
                                                screenshareAudioTrack.publication.track.attach(el);
                                                // Get current volume from state (not closure)
                                                const currentVolume = screenshareVolumes[trackSid] ?? 0.5;
                                                const clampedVolume = Math.max(0, Math.min(0.5, currentVolume));
                                                el.volume = clampedVolume;
                                                // Mute if volume is 0 OR if it's local screenshare
                                                el.muted = clampedVolume === 0 || isLocalScreenshare;
                                              }
                                            }}
                      
                                            autoPlay
                                            playsInline
                                            muted={isLocalScreenshare}
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

                                    {/* Volume control */}
                                    {isSubscribed && (
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-black/70 rounded-lg p-1 flex items-center gap-1">
                                          <Volume2 className="w-3 h-3 text-white" />
                                          <input
                                            type="range"
                                            min="0"
                                            max="0.5"
                                            step="0.01"
                                            value={volume}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              setScreenshareVolume(track.publication.trackSid, parseFloat(e.target.value));
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-16 h-1"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                                      <div className="flex items-center gap-1">
                                        <MonitorUp className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm truncate">
                                          {track.participant.name || track.participant.identity}{" "}
                                          <Badge variant="destructive">LIVE</Badge>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
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
                    );
                  })()
                )}
              </div>

              {/* Control Bar - Responsive positioning and sizing */}
              <div className="absolute bottom-2 sm:bottom-4 lg:bottom-[4rem] left-1/2 transform -translate-x-1/2 z-10 w-full max-w-sm sm:max-w-none sm:w-auto px-2 sm:px-0">
                <div className="bg-background/90 backdrop-blur-sm rounded-xl shadow-xl border border-border/50">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 sm:p-2 rounded-none group-hover:bg-muted rounded-r-lg"
                            type="button"
                          >
                            <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Microphone</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {inputDevices.map((device, index) => (
                            <DropdownMenuItem
                              key={`input-${device.deviceId}-${index}`}
                              onSelect={(e) => {
                                e.preventDefault();
                                handleSelectInput(device.deviceId);
                              }}
                            >
                              {device.label || "Default Microphone"}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Speaker</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {outputDevices.map((device, index) => (
                            <DropdownMenuItem
                              key={`output-${device.deviceId}-${index}`}
                              onSelect={(e) => {
                                e.preventDefault();
                                handleSelectOutput(device.deviceId);
                              }}
                            >
                              {device.label || "Default Speaker"}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 sm:p-2 rounded-none group-hover:bg-muted rounded-r-lg"
                            type="button"
                          >
                            <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Camera</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {cameraDevices.map((device, index) => (
                            <DropdownMenuItem
                              key={`camera-${device.deviceId}-${index}`}
                              onSelect={(e) => {
                                e.preventDefault();
                                handleSelectCamera(device.deviceId);
                              }}
                            >
                              {device.label || "Default Camera"}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            </div>
          </div>
        </>
      )}

      {!livekit.connected && (
        <div className="flex flex-col items-center justify-center w-full h-full px-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-black dark:text-white text-center">
            {channel.name}
          </h1>
          {connectedUsers.length > 0 && (
            <>
              <div className="flex flex-row items-center gap-2 mt-4 flex-wrap justify-center">
                {connectedUsers.map((participant) => {
                  const metadata = safeParseMetadata(participant.metadata);
                  const avatar = metadata?.avatar ?? "/default-avatar.png";

                  return (
                    <ActionTooltip
                      key={participant.identity}
                      label={participant.identity}
                    >
                      <img
                        key={participant.identity}
                        src={avatar}
                        alt={participant.identity}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white"
                      />
                    </ActionTooltip>
                  );
                })}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
                {connectedUsers.length} user
                {connectedUsers.length > 1 ? "s" : ""} connected
              </p>
            </>
          )}
          {connectedUsers.length === 0 && (
            <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
              No users connected yet. Join to start the call.
            </p>
          )}
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
}: {
  participant: any;
  allTracks: TrackReference[];
  setActiveParticipant: (participant: any) => void;
  setActiveScreenShare: (trackRef: TrackReference | null) => void;
}) {
  const metadata = safeParseMetadata(participant.metadata);
  const avatar = metadata?.avatar ?? "/default-avatar.png";
  const name = participant.name || participant.identity;
  const speaking = participant.isSpeaking;

  // Find camera track if published
  const cameraTrack = allTracks.find(
    (t) =>
      t.participant.identity === participant.identity &&
      t.publication.source === Track.Source.Camera &&
      !t.publication.isMuted
  );

  return (
    <div
      className={cn(
        "w-full h-full relative cursor-pointer transition-all",
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
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
        <div className="flex items-center gap-2">
          {!participant.isMicrophoneEnabled && <MicOff className="w-5 h-5" />}
          <span className="text-lg font-medium">{name}</span>
        </div>
      </div>
    </div>
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

