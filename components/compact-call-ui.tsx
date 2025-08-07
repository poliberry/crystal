"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  Maximize2, 
  Minimize2,
  Volume2,
  VolumeX,
  Settings,
  Users
} from "lucide-react";
import { 
  useLocalParticipant, 
  useRemoteParticipants, 
  useTracks,
  VideoTrack,
  AudioTrack
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLiveKit } from "./providers/media-room-provider";
import { ConversationType } from "@prisma/client";

type CompactCallUIProps = {
  conversationId: string;
  conversationName: string;
  conversationType: ConversationType;
  otherMember?: any;
};

export const CompactCallUI = ({
  conversationId,
  conversationName,
  conversationType,
  otherMember,
}: CompactCallUIProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { leave } = useLiveKit();
  const [isMinimized, setIsMinimized] = useState(false);

  const participants = useMemo(
    () => [localParticipant, ...remoteParticipants],
    [localParticipant, remoteParticipants]
  );

  // Get all tracks
  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.Microphone,
    Track.Source.ScreenShare,
  ]);

  // Check if anyone has video enabled
  const hasVideo = tracks.some(
    track => track.publication.source === Track.Source.Camera && !track.publication.isMuted
  );

  // Check if anyone is screen sharing
  const hasScreenShare = tracks.some(
    track => track.publication.source === Track.Source.ScreenShare
  );

  // Toggle functions
  const toggleMicrophone = () => {
    localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  };

  const toggleCamera = () => {
    localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
  };

  const toggleScreenShare = () => {
    localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled);
  };

  const endCall = () => {
    leave();
    // Navigate back to conversation without call parameters
    router.push(`/conversations/${conversationId}`);
  };

  const handleExpand = () => {
    // Navigate to expanded view
    const isVideo = searchParams?.get('video') === 'true';
    const queryParam = isVideo ? 'video=true' : 'audio=true';
    router.push(`/conversations/${conversationId}?${queryParam}&expanded=true`);
  };

  // Get speaking participants
  const speakingParticipants = participants.filter(p => p.isSpeaking);

  // Minimized view - just a small bar
  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
        <Phone className="h-4 w-4" />
        <span className="text-sm font-medium">In call</span>
        <Button
          onClick={() => setIsMinimized(false)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-white hover:bg-green-700"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background border-b border-muted shadow-sm">
      {/* Call Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {conversationType === ConversationType.GROUP_MESSAGE ? "Group Call" : "Voice Call"}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {participants.length} {participants.length === 1 ? "participant" : "participants"}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <ActionTooltip label="Minimize">
            <Button
              onClick={() => setIsMinimized(true)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </ActionTooltip>
          <ActionTooltip label="Expand">
            <Button
              onClick={handleExpand}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </ActionTooltip>
        </div>
      </div>

      {/* Screen Share Indicator */}
      {hasScreenShare && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800">
          <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {tracks.find(track => track.publication.source === Track.Source.ScreenShare)?.participant.identity === localParticipant.identity 
              ? "You are sharing your screen" 
              : `${tracks.find(track => track.publication.source === Track.Source.ScreenShare)?.participant.name || "Someone"} is sharing their screen`}
          </span>
        </div>
      )}

      {/* Participants Display */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Participants List */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {participants.slice(0, 6).map((participant) => {
            const isLocal = participant === localParticipant;
            const isSpeaking = participant.isSpeaking;
            const hasVideo = tracks.some(
              track => 
                track.participant.identity === participant.identity &&
                track.publication.source === Track.Source.Camera &&
                !track.publication.isMuted
            );

            // Get participant info
            let avatar = "/default-avatar.png";
            let name = participant.name || participant.identity;
            
            if (isLocal) {
              name = "You";
            } else if (conversationType === ConversationType.DIRECT_MESSAGE && otherMember) {
              avatar = otherMember.imageUrl || "/default-avatar.png";
              name = otherMember.globalName || otherMember.name || "Unknown";
            }

            return (
              <div key={participant.identity} className="flex items-center gap-2">
                <div className={cn(
                  "relative",
                  isSpeaking && "ring-2 ring-green-500 rounded-full"
                )}>
                  {hasVideo ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted relative">
                      {tracks
                        .filter(track => 
                          track.participant.identity === participant.identity &&
                          track.publication.source === Track.Source.Camera &&
                          !track.publication.isMuted
                        )
                        .map(track => (
                          <VideoTrack
                            key={track.publication.trackSid}
                            trackRef={track}
                            className="w-full h-full object-cover"
                          />
                        ))}
                    </div>
                  ) : (
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="text-xs">
                        {name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Mute indicator */}
                  {!participant.isMicrophoneEnabled && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <MicOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                
                <span className="text-sm font-medium text-foreground min-w-0 truncate">
                  {name}
                </span>
              </div>
            );
          })}

          {participants.length > 6 && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-sm text-muted-foreground">
                +{participants.length - 6} more
              </span>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-2">
          <ActionTooltip label={localParticipant.isMicrophoneEnabled ? "Mute" : "Unmute"}>
            <Button
              onClick={toggleMicrophone}
              variant={localParticipant.isMicrophoneEnabled ? "secondary" : "destructive"}
              size="sm"
              className="h-9 w-9 p-0"
            >
              {localParticipant.isMicrophoneEnabled ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </Button>
          </ActionTooltip>

          <ActionTooltip label={localParticipant.isCameraEnabled ? "Turn off camera" : "Turn on camera"}>
            <Button
              onClick={toggleCamera}
              variant={localParticipant.isCameraEnabled ? "secondary" : "outline"}
              size="sm"
              className="h-9 w-9 p-0"
            >
              {localParticipant.isCameraEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>
          </ActionTooltip>

          <ActionTooltip label={localParticipant.isScreenShareEnabled ? "Stop sharing" : "Share screen"}>
            <Button
              onClick={toggleScreenShare}
              variant={localParticipant.isScreenShareEnabled ? "secondary" : "outline"}
              size="sm"
              className="h-9 w-9 p-0"
            >
              {localParticipant.isScreenShareEnabled ? (
                <MonitorOff className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </ActionTooltip>

          <ActionTooltip label="End call">
            <Button
              onClick={endCall}
              variant="destructive"
              size="sm"
              className="h-9 w-9 p-0"
            >
              <Phone className="h-4 w-4" />
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
};
