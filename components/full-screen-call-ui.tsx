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
  Minimize2,
  Volume2,
  VolumeX,
  Settings,
  Users,
  ArrowLeft
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

type FullScreenCallUIProps = {
  conversationId: string;
  conversationName: string;
  conversationType: ConversationType;
  otherMember?: any;
};

export const FullScreenCallUI = ({
  conversationId,
  conversationName,
  conversationType,
  otherMember,
}: FullScreenCallUIProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { leave } = useLiveKit();

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

  // Get screen share track
  const screenShareTrack = tracks.find(
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

  const handleMinimize = () => {
    // Navigate back to compact view by removing expanded param
    const isVideo = searchParams?.get('video') === 'true';
    const queryParam = isVideo ? 'video=true' : 'audio=true';
    router.push(`/conversations/${conversationId}?${queryParam}`);
  };

  // Get speaking participants
  const speakingParticipants = participants.filter(p => p.isSpeaking);

  const renderParticipantVideo = (participant: any) => {
    const videoTrack = tracks.find(
      track => 
        track.participant.identity === participant.identity &&
        track.publication.source === Track.Source.Camera &&
        !track.publication.isMuted
    );

    const isLocal = participant === localParticipant;
    const isSpeaking = participant.isSpeaking;

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
      <div
        key={participant.identity}
        className={cn(
          "relative rounded-lg overflow-hidden bg-muted border border-border",
          participants.length === 1 ? "w-full h-full" :
          participants.length === 2 ? "w-full h-1/2" :
          "w-1/2 h-1/2",
          isSpeaking && "ring-2 ring-green-500"
        )}
      >
        {videoTrack ? (
          <div className="w-full h-full relative">
            <VideoTrack
              trackRef={videoTrack}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <span className="text-white text-sm font-medium bg-black/70 px-2 py-1 rounded">
                {name}
              </span>
              {!participant.isMicrophoneEnabled && (
                <div className="bg-red-500 p-1 rounded-full">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarImage src={avatar} />
              <AvatarFallback className="text-2xl">
                {name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-foreground text-lg font-medium">{name}</span>
            {!participant.isMicrophoneEnabled && (
              <div className="bg-red-500 p-2 rounded-full mt-2">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <ActionTooltip label="Back to chat">
            <Button
              onClick={handleMinimize}
              variant="ghost"
              size="sm"
              className="text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </ActionTooltip>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              {conversationType === ConversationType.GROUP_MESSAGE ? "Group Call" : conversationName}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {participants.length} {participants.length === 1 ? "participant" : "participants"}
          </Badge>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 p-4 bg-background">
        {hasScreenShare && screenShareTrack ? (
          <div className="w-full h-full flex flex-col">
            {/* Screen Share */}
            <div className="flex-1 bg-muted rounded-lg overflow-hidden mb-4">
              <VideoTrack
                trackRef={screenShareTrack}
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Participants in smaller view */}
            <div className="flex gap-2 h-32">
              {participants.map(participant => (
                <div key={participant.identity} className="flex-1 max-w-32">
                  {renderParticipantVideo(participant)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Regular video grid */
          <div className={cn(
            "w-full h-full grid gap-4",
            participants.length === 1 ? "grid-cols-1" :
            participants.length === 2 ? "grid-cols-1 grid-rows-2" :
            participants.length <= 4 ? "grid-cols-2 grid-rows-2" :
            "grid-cols-3 grid-rows-3"
          )}>
            {participants.map(participant => renderParticipantVideo(participant))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-background border-t border-muted">
        <ActionTooltip label={localParticipant.isMicrophoneEnabled ? "Mute" : "Unmute"}>
          <Button
            onClick={toggleMicrophone}
            variant={localParticipant.isMicrophoneEnabled ? "default" : "destructive"}
            size="lg"
            className="h-12 w-12 rounded-full"
          >
            {localParticipant.isMicrophoneEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>
        </ActionTooltip>

        <ActionTooltip label={localParticipant.isCameraEnabled ? "Turn off camera" : "Turn on camera"}>
          <Button
            onClick={toggleCamera}
            variant={localParticipant.isCameraEnabled ? "default" : "destructive"}
            size="lg"
            className="h-12 w-12 rounded-full"
          >
            {localParticipant.isCameraEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>
        </ActionTooltip>

        <ActionTooltip label={localParticipant.isScreenShareEnabled ? "Stop sharing" : "Share screen"}>
          <Button
            onClick={toggleScreenShare}
            variant={localParticipant.isScreenShareEnabled ? "default" : "secondary"}
            size="lg"
            className="h-12 w-12 rounded-full"
          >
            {localParticipant.isScreenShareEnabled ? (
              <MonitorOff className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </Button>
        </ActionTooltip>

        <ActionTooltip label="End call">
          <Button
            onClick={endCall}
            variant="destructive"
            size="lg"
            className="h-12 w-12 rounded-full"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </ActionTooltip>
      </div>
    </div>
  );
};
