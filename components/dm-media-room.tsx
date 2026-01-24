"use client";

import { useUser } from "@clerk/nextjs";
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
import {
  Camera,
  CameraOff,
  ChevronUp,
  Loader2,
  Mic,
  MicOff,
  MonitorDown,
  MonitorUp,
  Phone,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

import "@livekit/components-styles";
import { FloatingCallCard } from "./call-ui";
import { useLiveKit } from "./providers/media-room-provider";
import { cn } from "@/lib/utils";
import { Track } from "livekit-client";
import { Channel, Conversation, Profile, Server, ConversationType } from "@/types/conversation";
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
}

interface CrystalDesktopBridge {
  isVesktop: boolean;
  virtmic?: {
    list(): Promise<{
      ok: boolean;
      targets: Vesktop.AudioNode[];
      hasPipewirePulse: boolean;
    }>;
    start(includeSources: Vesktop.AudioNode[]): Promise<void>;
    startSystem(excludeSources: Vesktop.AudioNode[]): Promise<void>;
    stop(): Promise<void>;
  };
  platform?: {
    get(): string;
    isWindows(): boolean;
    isLinux(): boolean;
    isMacOS(): boolean;
  };
}

declare global {
  interface Window {
    CrystalDesktop?: CrystalDesktopBridge;
    VesktopNative?: {
      screenShare: {
        openPickerWindow(
          skipPicker?: boolean
        ): Promise<{
          id: string;
          contentHint?: string;
          audio?: boolean;
          includeSources?: "None" | "Entire System" | Vesktop.AudioNode[];
          excludeSources?: "None" | "Entire System" | Vesktop.AudioNode[];
        } | null>;
    };
  }
}

type MediaRoomProps = {
  conversation: Conversation;
  otherMember?: Profile; // Optional for group conversations
};

export const DMMediaRoom = ({ conversation, otherMember }: MediaRoomProps) => {
  const livekit = useLiveKit();
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [activeParticipant, setActiveParticipant] = useState<any>(null);
  const [activeScreenShare, setActiveScreenShare] = useState<any>(null);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const isVesktop =
    typeof window !== "undefined" && !!window.CrystalDesktop?.isVesktop;
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);

  // Determine display info based on conversation type
  const conversationName = conversation.type === ConversationType.GROUP_MESSAGE
    ? (conversation.name || "Group Call")
    : (otherMember?.globalName || otherMember?.name || "Unknown User");

  const conversationImageUrl = conversation.type === ConversationType.GROUP_MESSAGE
    ? "" // Could add a default group icon
    : (otherMember?.imageUrl || "");

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setInputDevices(devices.filter((d) => d.kind === "audioinput"));
      setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      setCameraDevices(devices.filter((d) => d.kind === "videoinput"));
    });
  }, []);

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

    // If disabling, just turn off screen share and stop any ongoing capture
    if (localParticipant.isScreenShareEnabled) {
      await localParticipant.setScreenShareEnabled(false);
      try {
        // If Vesktop virtmic is running, stop it
        if (
          typeof window !== "undefined" &&
          window.CrystalDesktop?.virtmic &&
          window.CrystalDesktop.platform?.isLinux()
        ) {
          await window.CrystalDesktop.virtmic.stop();
        }
      } catch (e) {
        console.warn("Failed to stop Vesktop virtmic for DM screenshare:", e);
      }
      try {
        new Audio("/sounds/sc-stop.mp3").play().catch(() => {});
      } catch (e) {}
      return;
    }

    // Prefer Vesktop screen share picker and audio capture when running inside Vesktop
    if (typeof window !== "undefined" && isVesktop && window.VesktopNative) {
      try {
        const platform = window.CrystalDesktop?.platform?.get() ?? "browser";
        const isLinux = window.CrystalDesktop?.platform?.isLinux?.() ?? false;
        const isWindows = window.CrystalDesktop?.platform?.isWindows?.() ?? false;
        const isMacOS = window.CrystalDesktop?.platform?.isMacOS?.() ?? false;

        // Use Vesktop's built-in screen share picker (same UI as Discord in Vesktop)
        const choice = await window.VesktopNative.screenShare.openPickerWindow(
          false
        );

        if (!choice) {
          // User cancelled
          return;
        }

        // Get video stream from selected source
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: choice.id,
            },
          } as any,
          audio: false,
        });

        const videoTrack = videoStream.getVideoTracks()[0];
        if (!videoTrack) {
          throw new Error("No video track from Vesktop screen share picker");
        }

        // Publish the screen video track to LiveKit
        await localParticipant.publishTrack(videoTrack, {
          source: Track.Source.ScreenShare,
        });

        const audioStreams: MediaStream[] = [];

        const handleTrackEnd = async () => {
          try {
            if (
              typeof window !== "undefined" &&
              window.CrystalDesktop?.virtmic &&
              window.CrystalDesktop.platform?.isLinux()
            ) {
              await window.CrystalDesktop.virtmic.stop();
            }
          } catch (err) {
            console.warn("Failed to stop Vesktop virtmic on track end:", err);
          }

          videoStream.getTracks().forEach((t) => t.stop());
          audioStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
        };

        // Linux system audio via Vesktop virtmic
        if (
          isLinux &&
          choice.audio &&
          choice.includeSources &&
          choice.includeSources !== "None" &&
          window.CrystalDesktop?.virtmic
        ) {
          try {
            let includeNodes = choice.includeSources as
              | Vesktop.AudioNode[]
              | "Entire System";

            if (includeNodes === "Entire System") {
              // Use Vesktop's "entire system" helper
              await window.CrystalDesktop.virtmic.startSystem(
                !choice.excludeSources ||
                choice.excludeSources === "None" ||
                choice.excludeSources === "Entire System"
                  ? []
                  : (choice.excludeSources as Vesktop.AudioNode[])
              );
            } else if (Array.isArray(includeNodes) && includeNodes.length > 0) {
              await window.CrystalDesktop.virtmic.start(includeNodes);
            }

            // Wait for the virtual mic device to appear and capture from it
            let virtmicDevice: MediaDeviceInfo | null = null;
            for (let attempt = 0; attempt < 10; attempt++) {
              await new Promise((resolve) => setTimeout(resolve, 200));

              try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
              } catch {
                // ignore
              }

              const devices =
                await navigator.mediaDevices.enumerateDevices();
              virtmicDevice = devices.find(
                ({ kind, label }) =>
                  kind === "audioinput" &&
                  (label === "vencord-screen-share" ||
                    label === "crystal-screen-share" ||
                    label.toLowerCase().includes("virtmic") ||
                    label.toLowerCase().includes("vesktop"))
              ) as MediaDeviceInfo | null;

              if (virtmicDevice) break;
            }

            if (virtmicDevice) {
              const audioStream =
                await navigator.mediaDevices.getUserMedia({
                  audio: {
                    deviceId: { exact: virtmicDevice.deviceId },
                    autoGainControl: false,
                    echoCancellation: false,
                    noiseSuppression: false,
                    channelCount: 2,
                    sampleRate: 48000,
                    sampleSize: 16,
                  } as any,
                });

              audioStreams.push(audioStream);
              const audioTrack = audioStream.getAudioTracks()[0];
              if (audioTrack) {
                audioTrack.addEventListener("ended", handleTrackEnd);
                await localParticipant.publishTrack(audioTrack, {
                  source: Track.Source.ScreenShareAudio,
                });
              }
            } else {
              console.warn(
                "Vesktop virtual microphone not found for DM screenshare; audio will not be shared."
              );
            }
          } catch (err) {
            console.warn(
              "Failed to capture Linux system audio via Vesktop virtmic in DM room:",
              err
            );
          }
        } else if (choice.audio && (isWindows || isMacOS)) {
          // On Windows/macOS, Chromium/Electron already provide system audio with getDisplayMedia/getUserMedia
          try {
            const audioDisplayStream =
              await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: true,
              } as any);

            const audioTracks = audioDisplayStream.getAudioTracks();
            if (audioTracks.length > 0) {
              const audioStream = new MediaStream(audioTracks);
              audioStreams.push(audioStream);
              const audioTrack = audioStream.getAudioTracks()[0];
              if (audioTrack) {
                audioTrack.addEventListener("ended", handleTrackEnd);
                await localParticipant.publishTrack(audioTrack, {
                  source: Track.Source.ScreenShareAudio,
                });
              }
            } else {
              audioDisplayStream.getTracks().forEach((t) => t.stop());
              console.warn(
                "No system audio tracks returned for DM screenshare on this platform."
              );
            }
          } catch (err) {
            console.warn(
              "Failed to capture system audio via native loopback for DM screenshare:",
              err
            );
          }
        }

        try {
          new Audio("/sounds/sc-start.mp3").play().catch(() => {});
        } catch (e) {}
      } catch (err) {
        console.warn(
          "Vesktop screen share picker failed in DM room, falling back to browser getDisplayMedia:",
          err
        );
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
        });
      }
    } else {
      // Not in Vesktop - use browser's getDisplayMedia with system audio
      await localParticipant.setScreenShareEnabled(true, {
        audio: true,
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
  ]);

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
        imageUrl={conversationImageUrl}
        name={conversationName}
        type="conversation"
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
                                <span className="text-xs truncate">{name}</span>
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

                          return (
                            <div
                              key={`screenshare-${track.publication.trackSid}`}
                              onClick={() => {
                                if (isActiveScreenShare) {
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
                              <TrackRefVideoCard trackRef={track} />

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
                  // Responsive grid when no active view
                  <div className="h-full overflow-y-auto overflow-x-hidden pb-2 sm:pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 justify-items-center py-2 sm:py-4 px-2 sm:px-4">
                      {/* Participant Cards - Responsive */}
                      {participants.map((participant) => {
                        const metadata = safeParseMetadata(
                          participant.metadata
                        );
                        const avatar =
                          metadata?.avatar ?? "/default-avatar.png";
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
                            key={participant.identity}
                            className={cn(
                              "relative rounded-lg overflow-hidden p-1 border-2 bg-background cursor-pointer transition-all duration-200 ease-in-out",
                              "w-72 h-44 sm:w-80 sm:h-48", // Responsive sizing
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
                      })}

                      {/* Screen Share Cards - Responsive */}
                      {allTracks
                        .filter(
                          (t) =>
                            t.publication.source === Track.Source.ScreenShare
                        )
                        .map((track) => {
                          return (
                            <div
                              key={`screenshare-${track.publication.trackSid}`}
                              onClick={() => {
                                setActiveScreenShare(track);
                                setActiveParticipant(null);
                              }}
                              className={cn(
                                "rounded-lg overflow-hidden border-2 border-blue-500 shadow-md cursor-pointer relative bg-background transition-all duration-200 ease-in-out",
                                "w-72 h-44 sm:w-80 sm:h-48" // Responsive sizing
                              )}
                            >
                              <TrackRefVideoCard trackRef={track} />

                              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                                <div className="flex items-center gap-1">
                                  <MonitorUp className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm truncate">
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
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 sm:p-2 rounded-none group-hover:bg-muted rounded-r-lg"
                          >
                            <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Microphone</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {inputDevices.map((device) => (
                            <DropdownMenuItem
                              key={device.deviceId}
                              onClick={() => {
                                handleSelectInput(device.deviceId);
                              }}
                            >
                              {device.label || "Default Microphone"}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Speaker</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {outputDevices.map((device) => (
                            <DropdownMenuItem
                              key={device.deviceId}
                              onClick={() => {
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
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 sm:p-2 rounded-none group-hover:bg-muted rounded-r-lg"
                          >
                            <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Camera</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {cameraDevices.map((device) => (
                            <DropdownMenuItem
                              key={device.deviceId}
                              onClick={() => {
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
