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
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { disconnectLiveKitRoom } from "@/lib/LiveKitRoomManager";
import { useLiveKit } from "./providers/media-room-provider";
import { useSocket } from "./providers/pusher-provider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Floating UI component to persist across tab views
export function FloatingCallCard() {
  const room = useRoomContext();
  const liveKit = useLiveKit();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [isSharingScreen, setSharingScreen] = useState(false);
  const { user } = useUser();
  const [isSpeaking, setIsSpeaking] = useState(localParticipant.isSpeaking);
  const allParticipants = [localParticipant, ...remoteParticipants];
  const { socket } = useSocket();
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
    room.localParticipant.setScreenShareEnabled(
      !room.localParticipant.isScreenShareEnabled
    );
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
    
    // Emit call end event to notify other participants
    if (socket && pathname?.includes('/conversations/')) {
      const conversationId = pathname.split('/conversations/')[1]?.split('?')[0];
      if (conversationId) {
        socket.emit("call:ended", {
          conversationId,
          type: searchParams?.get('video') ? 'video' : 'voice',
        });
      }
    }
    
    // Leave the LiveKit room
    liveKit.leave();
    
    // Remove call parameters from URL
    if (pathname?.includes('/conversations/')) {
      const conversationId = pathname.split('/conversations/')[1]?.split('?')[0];
      if (conversationId) {
        router.push(`/conversations/${conversationId}`);
      }
    }
  };

  return (
    <div className="z-50 w-full bg-white dark:bg-background text-white shadow-l border-t transition-all duration-400 overflow-hidden">
      <div className="flex flex-row border-b items-center p-2 justify-between">
        <div className="flex flex-col items-start gap-1">
          <div className="text-sm font-medium text-foreground">
            Voice Connected
          </div>
          <a href={`/servers/${liveKit.serverId}/channels/${liveKit.roomId}`}>
            <div className="text-xs text-muted-foreground font-medium hover:underline cursor-pointer">
              {liveKit.roomName || "Unknown Room"} /{" "}
              {liveKit.serverName || "Unknown Server"}
            </div>
          </a>
        </div>
        <Button variant="ghost" size="icon" onClick={disconnectCall}>
          <Phone className={cn("h-5 w-5 text-red-400 rotate-[135deg]")} />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 px-2 pt-2">
        {/* Local user avatar */}
        {allParticipants.map((p) => {
          const metadata = safeParseMetadata(p.metadata);
          return (
            <AvatarCard
              name={p?.identity}
              image={metadata?.avatar}
              isSpeaking={p.isSpeaking}
            />
          );
        })}
      </div>
      <div className="flex gap-2 p-2 justify-center">
        {localParticipant.isMicrophoneEnabled ? (
          <Button
            variant="secondary"
            className="w-full p-1"
            onClick={() => {
              const mute = new Audio("/sounds/mute.ogg");
              mute.play();
              localParticipant.setMicrophoneEnabled(
                !localParticipant.isMicrophoneEnabled
              );
            }}
          >
            <Mic className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="primary"
            className="w-full bg-red-500 hover:bg-red-700 p-1"
            onClick={() => {
              const unmute = new Audio("/sounds/unmute.ogg");
              unmute.play();
              localParticipant.setMicrophoneEnabled(
                !localParticipant.isMicrophoneEnabled
              );
            }}
          >
            <MicOff className="h-5 w-5" />
          </Button>
        )}
        {localParticipant.isCameraEnabled ? (
          <Button
            variant="primary"
            className="w-full bg-green-500 hover:bg-green-700 p-1"
            onClick={() =>
              localParticipant.setCameraEnabled(
                !localParticipant.isCameraEnabled
              )
            }
          >
            <Video className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full p-1"
            onClick={() =>
              localParticipant.setCameraEnabled(
                !localParticipant.isCameraEnabled
              )
            }
          >
            <VideoOff className="h-5 w-5" />
          </Button>
        )}
        {localParticipant.isScreenShareEnabled ? (
          <Button
            variant="primary"
            className="w-full bg-red-500 hover:bg-red-700 p-1"
            onClick={() => {
              toggleScreenShare();
            }}
          >
            <MonitorDown className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              toggleScreenShare();
            }}
          >
            <MonitorUp className="h-5 w-5" />
          </Button>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-full p-1">
              <Signal className="h-5 w-5" />
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
