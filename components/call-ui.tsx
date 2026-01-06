"use client";

import {
  useTracks,
  useLocalParticipant,
  useRoomContext,
  useRemoteParticipants,
} from "@livekit/components-react";
import {
  Track,
  Participant,
  Room,
  RemoteTrackPublication,
  RemoteParticipant,
  RoomEvent,
  LocalTrackPublication,
  LocalParticipant,
} from "livekit-client";
import { useEffect, useState } from "react";
import {
  Mic,
  Video,
  MonitorUp,
  Signal,
  PhoneOff,
  Phone,
  VideoOff,
  MonitorDown,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { disconnectLiveKitRoom } from "@/lib/LiveKitRoomManager";
import { useLiveKit } from "./providers/media-room-provider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Call controls component (content of the popover)
function CallControls() {
  const room = useRoomContext();
  const liveKit = useLiveKit();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [isSharingScreen, setSharingScreen] = useState(false);
  const { user } = useAuthStore();
  const [isSpeaking, setIsSpeaking] = useState(localParticipant.isSpeaking);
  const allParticipants = [localParticipant, ...remoteParticipants];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Listen for isSpeaking changes
  useEffect(() => {
    const handleParticipantConnected = (participant: Participant) => {
      if (participant) {
        const call_connect = new Audio("/sounds/call-new-user.ogg");
        call_connect.play();
      }
    };
    const handleParticipantDisconnected = (participant: Participant) => {
      if (participant) {
        const call_disconnect = new Audio("/sounds/call-lost-user.ogg");
        call_disconnect.play();
      }
    };
    const handleRemoteTrackSubscribed = (
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (publication.source === Track.Source.ScreenShare) {
        console.log(
          "🔊 Remote user started screen sharing:",
          participant.identity
        );
        const sc_start = new Audio("/sounds/sc-start.ogg");
        sc_start.play();
      }
    };

    const handleLocalTrackPublished = (publication: LocalTrackPublication) => {
      if (publication.source === Track.Source.ScreenShare) {
        console.log("🔊 You started screen sharing");
        const sc_start = new Audio("/sounds/sc-start.ogg");
        sc_start.play();
      }
    };

    const onRemoteUnpublished = (
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (publication.source === Track.Source.ScreenShare) {
        const sc_stop = new Audio("/sounds/sc-end.ogg");
        sc_stop.play();
      }
    };

    const onLocalUnpublished = (
      publication: LocalTrackPublication,
      participant: LocalParticipant
    ) => {
      if (publication.source === Track.Source.ScreenShare) {
        const sc_stop = new Audio("/sounds/sc-end.ogg");
        sc_stop.play();
      }
    };

    room.on(RoomEvent.TrackPublished, handleRemoteTrackSubscribed);
    room.on(RoomEvent.TrackUnpublished, onRemoteUnpublished);

    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, onLocalUnpublished);
    const handleSpeakingChanged = () => {
      setIsSpeaking(localParticipant.isSpeaking);
    };
    localParticipant.on("isSpeakingChanged", handleSpeakingChanged);
    room.on("participantConnected", handleParticipantConnected);
    room.on("participantDisconnected", handleParticipantDisconnected);
    return () => {
      localParticipant.off("isSpeakingChanged", handleSpeakingChanged);
      room.off("participantConnected", handleParticipantConnected);
      room.off("participantDisconnected", handleParticipantDisconnected);
      room.off("trackPublished", handleRemoteTrackSubscribed);
      room.off("localTrackPublished", handleLocalTrackPublished);
    };
  }, [localParticipant]);

  const toggleScreenShare = async () => {
    const isEnabled = room.localParticipant.isScreenShareEnabled;
    if (isEnabled) {
      // Disable screen share
      room.localParticipant.setScreenShareEnabled(false);
      try {
        new Audio('/sounds/sc-stop.mp3').play().catch(() => {});
      } catch (e) {}
    } else {
      // Enable screen share with system audio capture
      room.localParticipant.setScreenShareEnabled(true, {
        audio: true
      });
    }
  };

  function safeParseMetadata(raw?: string): { avatar?: string } | null {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const disconnectCall = async () => {
    const call_connect = new Audio("/sounds/call-disconnect.ogg");
    call_connect.play();

    // Leave the LiveKit room
    liveKit.leave();

    // Remove call parameters from URL
    if (liveKit.roomType === "conversation" && liveKit.conversationId) {
      router.push(`/conversations/${liveKit.conversationId}`);
    } else if (pathname?.includes("/conversations/")) {
      const conversationId = pathname.split("/conversations/")[1]?.split("?")[0];
      if (conversationId) {
        router.push(`/conversations/${conversationId}`);
      }
    } else if (liveKit.serverId && liveKit.roomId) {
      router.push(`/servers/${liveKit.serverId}/channels/${liveKit.roomId}`);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-72">
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b pb-2">
        <div className="flex flex-col items-start gap-1">
          <div className="text-sm font-medium text-foreground">
            {liveKit.roomType === "conversation" ? "Voice Call" : "Voice Connected"}
          </div>
          {liveKit.roomType === "conversation" && liveKit.conversationId ? (
            <a href={`/conversations/${liveKit.conversationId}`}>
              <div className="text-xs text-muted-foreground font-medium hover:underline cursor-pointer">
                {liveKit.roomName || "Direct Message"}
              </div>
            </a>
          ) : liveKit.serverId && liveKit.roomId ? (
            <a href={`/servers/${liveKit.serverId}/channels/${liveKit.roomId}`}>
              <div className="text-xs text-muted-foreground font-medium hover:underline cursor-pointer">
                {liveKit.roomName || "Unknown Room"} /{" "}
                {liveKit.serverName || "Unknown Server"}
              </div>
            </a>
          ) : (
            <div className="text-xs text-muted-foreground font-medium">
              {liveKit.roomName || "Unknown Room"}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={disconnectCall} className="h-6 w-6">
          <Phone className={cn("h-4 w-4 text-red-400 rotate-[135deg]")} />
        </Button>
      </div>

      {/* Participants */}
      <div className="flex flex-wrap gap-2">
        {allParticipants.map((p) => {
          const metadata = safeParseMetadata(p.metadata);
          return (
            <AvatarCard
              key={p.sid}
              name={p?.identity}
              image={metadata?.avatar}
              isSpeaking={p.isSpeaking}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {localParticipant.isMicrophoneEnabled ? (
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={() => {
              const mute = new Audio("/sounds/mute.ogg");
              mute.play();
              localParticipant.setMicrophoneEnabled(
                !localParticipant.isMicrophoneEnabled
              );
            }}
          >
            <Mic className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="icon"
            className="flex-1 bg-red-500 hover:bg-red-700"
            onClick={() => {
              const unmute = new Audio("/sounds/unmute.ogg");
              unmute.play();
              localParticipant.setMicrophoneEnabled(
                !localParticipant.isMicrophoneEnabled
              );
            }}
          >
            <MicOff className="h-4 w-4" />
          </Button>
        )}
        {localParticipant.isCameraEnabled ? (
          <Button
            variant="default"
            size="icon"
            className="flex-1 bg-green-500 hover:bg-green-700"
            onClick={() =>
              localParticipant.setCameraEnabled(
                !localParticipant.isCameraEnabled
              )
            }
          >
            <Video className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={() =>
              localParticipant.setCameraEnabled(
                !localParticipant.isCameraEnabled
              )
            }
          >
            <VideoOff className="h-4 w-4" />
          </Button>
        )}
        {localParticipant.isScreenShareEnabled ? (
          <Button
            variant="default"
            size="icon"
            className="flex-1 bg-red-500 hover:bg-red-700"
            onClick={() => {
              toggleScreenShare();
            }}
          >
            <MonitorDown className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={() => {
              toggleScreenShare();
            }}
          >
            <MonitorUp className="h-4 w-4" />
          </Button>
        )}
        <Dialog>
          <DialogTrigger>
            <Button variant="secondary" size="icon" className="flex-1">
              <Signal className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 text-white">
            <p>Stats and settings coming soon.</p>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Popover wrapper component
export function FloatingCallCard() {
  const liveKit = useLiveKit();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const allParticipants = [localParticipant, ...remoteParticipants];

  if (!liveKit.connected) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="default"
          size="sm"
          className={cn(
            "h-8 min-w-0 flex-shrink-0 hover:bg-green-600 px-2 bg-green-800 hover:bg-green-600"
          )}
        >
          <div className="flex items-center gap-1 max-w-full overflow-hidden">
            {allParticipants.slice(0, 3).map((p, index) => {
              function safeParseMetadata(raw?: string): { avatar?: string } | null {
                try {
                  return raw ? JSON.parse(raw) : null;
                } catch {
                  return null;
                }
              }
              const metadata = safeParseMetadata(p.metadata);
              return (
                <div
                  key={p.identity || index}
                  className={cn(
                    "relative w-5 h-5 rounded-full overflow-hidden border-2 flex-shrink-0",
                    p.isSpeaking ? "border-green-400" : "border-zinc-700"
                  )}
                >
                  {metadata?.avatar ? (
                    <img src={metadata.avatar} alt={p.identity} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-xs">
                      {p.identity?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}
            {allParticipants.length > 3 && (
              <span className="text-xs text-green-400 ml-1">
                +{allParticipants.length - 3}
              </span>
            )}
          </div>
          <Phone className="h-4 w-4 text-green-400 ml-1 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-auto p-3">
        <CallControls />
      </PopoverContent>
    </Popover>
  );
}

function AvatarCard({
  name,
  image,
  isSpeaking,
}: {
  name: string;
  image?: string;
  isSpeaking: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-8 h-8 rounded-full overflow-hidden border-2",
        isSpeaking ? "border-green-400" : "border-zinc-700"
      )}
    >
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-xs">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
