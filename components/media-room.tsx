"use client";

import { useUser } from "@clerk/nextjs";
import { ControlBar, LiveKitRoom, ParticipantTile, TrackRefContext, TrackReference, useLocalParticipant, useRemoteParticipants, useTrackRefContext, useTracks, VideoConference } from "@livekit/components-react";
import { Camera, CameraOff, ChevronUp, Loader2, Mic, MicOff, MonitorDown, MonitorUp, Phone } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

import "@livekit/components-styles";
import { FloatingCallCard } from "./call-ui";
import { useLiveKit } from "./providers/media-room-provider";
import { cn } from "@/lib/utils";
import { Track } from "livekit-client";
import { Channel, Server } from "@prisma/client";
import { RoomServiceClient } from "livekit-server-sdk";
import { roomService } from "@/lib/livekit-room-service";
import { ActionTooltip } from "./action-tooltip";
import { Button } from "./ui/button";
import { ChatHeader } from "./chat/chat-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

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
  const remoteParticipants = useRemoteParticipants();
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setInputDevices(devices.filter(d => d.kind === 'audioinput'));
      setOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
      setCameraDevices(devices.filter(d => d.kind === 'videoinput'));
    });
  }, []);

  const handleSelectInput = async (deviceId: string) => {
    localParticipant.activeDeviceMap.set('audioinput', deviceId);
  };

  const handleSelectOutput = async (deviceId: string) => {
    localParticipant.activeDeviceMap.set('audiooutput', deviceId);
  };

  const handleSelectCamera = async (deviceId: string) => {
    localParticipant.activeDeviceMap.set('videoinput', deviceId);
  };

  const toggleScreenShare = async () => {
    localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled);
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
        name={channel.name}
        serverId={channel.serverId}
        type="channel"
      />
      {
        livekit.connected && (
          <>
            {
              activeParticipant && !activeScreenShare && (
                <ActiveParticipantCard
                  setActiveParticipant={setActiveParticipant}
                  setActiveScreenShare={setActiveScreenShare}
                  participant={activeParticipant}
                  allTracks={allTracks}
                />
              )
            }
            {
              !activeParticipant && activeScreenShare && (
                <div
                  className={cn(
                    "relative overflow-hidden h-[500px] bg-background transition-all",
                    "border-zinc-800"
                  )}
                  onClick={() => {
                    setActiveParticipant(null);
                    setActiveScreenShare(null);
                  }}
                >
                  <FullVideoRenderer trackRef={activeScreenShare} />
                </div>
              )
            }
            <div className="p-4 flex flex-col items-center justify-between w-full h-full">
              {/* Main Participant Grid */}
              <div className={cn(
                "flex flex-row flex-wrap items-center justify-center gap-4 w-full",
                activeParticipant !== null || activeScreenShare !== null ? "" : "h-full -mt-12"
              )}>
                {participants.map((participant) => {
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
                      key={participant.identity}
                      className={cn(
                        "relative rounded-lg overflow-hidden p-1 border-2 transition-all bg-background",
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
                        <div className="w-96 h-52 flex items-center justify-center bg-background">
                          <img
                            src={avatar}
                            alt={name}
                            className="w-24 h-24 object-cover rounded-full"
                          />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 text-sm rounded">
                        <div className="flex items-center gap-1">
                          {!participant.isMicrophoneEnabled ? (
                            <MicOff className="w-4 h-4" />
                          ) : ""}
                          <span>{name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {screenShareTracks.length > 0 && allTracks
                  .filter((t) => t.publication.source === Track.Source.ScreenShare)
                  .map((track) => (
                    <div
                      key={track.publication.trackSid}
                      onClick={() => {
                        setActiveScreenShare(track);
                        setActiveParticipant(null);
                      }}
                      className="rounded-lg overflow-hidden w-96 h-52 border-2 border-muted shadow-md"
                    >
                      <TrackRefVideoCard trackRef={track} />
                    </div>
                  ))}
              </div>
            </div>

            {/* Screen Share Section */}
            <div className="absolute bottom-2 left-1/2">
              <div className="w-full bg-background rounded-lg shadow-lg">
                <div className="flex flex-row items-center gap-2 justify-between p-2">
                  <div className="flex group group-hover:bg-muted-foreground rounded-md flex-row items-center gap-0.5">
                    {localParticipant.isMicrophoneEnabled ? (
                      <Button
                        variant="ghost"
                        className="w-full p-1 rounded-none group-hover:bg-muted rounded-l-md"
                        onClick={() => {
                          const mute = new Audio("/sounds/mute.ogg");
                          mute.play();
                          localParticipant.setMicrophoneEnabled(
                            !localParticipant.isMicrophoneEnabled
                          )
                        }
                        }
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full bg-red-500 group-hover:bg-red-700 p-1 rounded-none rounded-l-md"
                        onClick={() => {
                          const unmute = new Audio("/sounds/unmute.ogg");
                          unmute.play();
                          localParticipant.setMicrophoneEnabled(
                            !localParticipant.isMicrophoneEnabled
                          )
                        }
                        }
                      >
                        <MicOff className="h-5 w-5" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-none group-hover:bg-muted rounded-r-md">
                          <ChevronUp className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Microphone</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {inputDevices.map((device) => (
                          <DropdownMenuItem
                            key={device.deviceId}
                            onClick={() => {
                              handleSelectInput(device.deviceId)
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
                              handleSelectOutput(device.deviceId)
                            }}
                          >
                            {device.label || "Default Speaker"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex group group-hover:bg-muted-foreground rounded-md flex-row items-center gap-0.5">
                    {localParticipant.isCameraEnabled ? (
                      <Button
                        variant="ghost"
                        className="w-full p-1 rounded-none group-hover:bg-muted rounded-l-md"
                        onClick={() => {
                          const mute = new Audio("/sounds/mute.ogg");
                          mute.play();
                          localParticipant.setCameraEnabled(
                            !localParticipant.isCameraEnabled
                          )
                        }
                        }
                      >
                        <Camera className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full bg-red-500 group-hover:bg-red-700 p-1 rounded-none rounded-l-md"
                        onClick={() => {
                          const unmute = new Audio("/sounds/unmute.ogg");
                          unmute.play();
                          localParticipant.setCameraEnabled(
                            !localParticipant.isCameraEnabled
                          )
                        }
                        }
                      >
                        <CameraOff className="h-5 w-5" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-none group-hover:bg-muted rounded-r-md">
                          <ChevronUp className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Camera</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {cameraDevices.map((device) => (
                          <DropdownMenuItem
                            key={device.deviceId}
                            onClick={() => {
                              handleSelectCamera(device.deviceId)
                            }}
                          >
                            {device.label || "Default Camera"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {localParticipant.isScreenShareEnabled ? (
                    <Button variant="primary" size="icon" className="bg-red-500 hover:bg-red-700 p-1" onClick={() => {
                      const stopShare = new Audio("/sounds/sc-end.ogg");
                      stopShare.play();
                      toggleScreenShare();
                    }}>
                      <MonitorDown className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button variant="secondary" size="icon" onClick={() => {
                      const startShare = new Audio("/sounds/sc-start.ogg");
                      startShare.play();
                      toggleScreenShare();
                    }}>
                      <MonitorUp className="h-5 w-5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={disconnectCall}>
                    <Phone className={cn("h-5 w-5 text-red-400 rotate-[135deg]")} />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )
      }
      {
        !livekit.connected && (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <h1 className="text-2xl font-semibold text-black dark:text-white">
              {channel.name}
            </h1>
            {
              connectedUsers.length > 0 && (
                <>
                  <div className="flex flex-row items-center gap-2 mt-4">
                    {connectedUsers.map((participant) => {
                      const metadata = safeParseMetadata(participant.metadata);
                      const avatar = metadata?.avatar ?? "/default-avatar.png";

                      return (
                        <ActionTooltip key={participant.identity} label={participant.identity}>
                          <img
                            key={participant.identity}
                            src={avatar}
                            alt={participant.identity}
                            className="w-10 h-10 rounded-full border-2 border-white"
                          />
                        </ActionTooltip>
                      );
                    })}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {connectedUsers.length} user{connectedUsers.length > 1 ? "s" : ""} connected
                  </p>
                </>
              )
            }
            {
              connectedUsers.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No users connected yet. Join to start the call.
                </p>
              )
            }
            <Button
              className="mt-4"
              onClick={() => {
                const call_connect = new Audio("/sounds/call-connect.ogg");
                call_connect.play();
                livekit.join(channel.id, channel.name, server?.name as string, true, false);
              }}
            >
              Join channel
            </Button>
          </div>
        )
      }
    </div>
  );
};

// Renders a video tile from a TrackRef (used for screen share)
function TrackRefVideoCard({ trackRef }: { trackRef: TrackReference }) {
  return (
    <TrackRefContext.Provider value={trackRef}>
      <ParticipantTile className="w-full h-full" />
    </TrackRefContext.Provider>
  );
}

function FullVideoRenderer({ trackRef }: { trackRef: TrackReference }) {
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
      className="w-full h-full object-contain"
    />
  );
}

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
      className="w-96 h-52 object-contain"
    />
  );
}

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
      key={participant.identity}
      onClick={() => {
        setActiveParticipant(null);
        setActiveScreenShare(null);
      }}
      className={cn(
        "relative overflow-hidden h-[500px] border-2 bg-background transition-all",
        speaking
          ? "border-green-500 shadow-md shadow-green-500/30"
          : "border-zinc-800",
      )}
    >
      {cameraTrack ? (
        <FullVideoRenderer trackRef={cameraTrack} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-background">
          <img
            src={avatar}
            alt={name}
            className="w-48 h-48 object-cover rounded-full"
          />
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 text-sm rounded">
        {name}
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