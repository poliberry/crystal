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
  ArrowLeft,
} from "lucide-react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
  AudioTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLiveKit } from "./providers/media-room-provider";
import { ConversationType } from "@prisma/client";

type ExpandedCallUIProps = {
  conversationId: string;
  conversationName: string;
  conversationType: ConversationType;
  otherMember?: any;
};

export const ExpandedCallUI = ({
  conversationId,
  conversationName,
  conversationType,
  otherMember,
}: ExpandedCallUIProps) => {
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
    (track) =>
      track.publication.source === Track.Source.Camera &&
      !track.publication.isMuted
  );

  // Check if anyone is screen sharing
  const hasScreenShare = tracks.some(
    (track) => track.publication.source === Track.Source.ScreenShare
  );

  // Get screen share track
  const screenShareTrack = tracks.find(
    (track) => track.publication.source === Track.Source.ScreenShare
  );

  // Toggle functions
  const toggleMicrophone = () => {
    localParticipant.setMicrophoneEnabled(
      !localParticipant.isMicrophoneEnabled
    );
  };

  const toggleCamera = () => {
    localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
  };

  const toggleScreenShare = () => {
    localParticipant.setScreenShareEnabled(
      !localParticipant.isScreenShareEnabled
    );
  };

  const disconnectCall = () => {
    leave();
    // Navigate back to conversation without call parameters
    router.push(`/conversations/${conversationId}`);
  };

  const minimizeCall = () => {
    // Navigate to compact view
    const isVideo = searchParams?.get("video") === "true";
    const queryParam = isVideo ? "video=true" : "audio=true";
    router.push(`/conversations/${conversationId}?${queryParam}`);
  };

  function safeParseMetadata(raw?: string): { avatar?: string } | null {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  return (
    <div className="h-full flex flex-col bg-black relative">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-3">
          <ActionTooltip label="Back to chat">
            <Button
              onClick={minimizeCall}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </ActionTooltip>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{conversationName}</span>
            <span className="text-xs text-muted-foreground">
              {participants.length}{" "}
              {participants.length === 1 ? "participant" : "participants"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 p-4 bg-black">
        {hasScreenShare && screenShareTrack ? (
          <div className="w-full h-[70%] flex flex-col">
            {/* Screen Share */}
            <div className="flex-1 bg-muted rounded-lg overflow-hidden mb-4">
              <VideoTrack
                trackRef={screenShareTrack}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Participants in smaller view */}
            <div className="flex flex-row justify-center gap-2 h-28">
              {participants.slice(0, 6).map((participant) => {
                const isLocal = participant === localParticipant;
                const hasVideo = tracks.some(
                  (track) =>
                    track.participant.identity === participant.identity &&
                    track.publication.source === Track.Source.Camera &&
                    !track.publication.isMuted
                );

                const videoTrack = tracks.find(
                  (track) =>
                    track.participant.identity === participant.identity &&
                    track.publication.source === Track.Source.Camera
                );

                return (
                  <div
                    key={participant.identity}
                    className="bg-background rounded-lg overflow-hidden w-52 relative"
                  >
                    {hasVideo && videoTrack ? (
                      <VideoTrack
                        trackRef={videoTrack}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={
                              safeParseMetadata(
                                participant.metadata
                              )?.avatar
                            }
                          />
                          <AvatarFallback>
                            {participant.identity?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}

                    <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
                      {participant.identity}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* No screen share - show participants in grid */
          <div
            className={cn(
              "grid gap-4 h-full",
              participants.length === 1 && "grid-cols-1",
              participants.length === 2 && "grid-cols-2",
              participants.length <= 4 &&
                participants.length > 2 &&
                "grid-cols-2",
              participants.length > 4 && "grid-cols-3"
            )}
          >
            {participants.map((participant) => {
              const isLocal = participant === localParticipant;
              const isSpeaking = participant.isSpeaking;
              const hasVideo = tracks.some(
                (track) =>
                  track.participant.identity === participant.identity &&
                  track.publication.source === Track.Source.Camera &&
                  !track.publication.isMuted
              );

              const videoTrack = tracks.find(
                (track) =>
                  track.participant.identity === participant.identity &&
                  track.publication.source === Track.Source.Camera
              );

              return (
                <div
                  key={participant.identity}
                  className={cn(
                    "bg-muted rounded-lg overflow-hidden relative border-2 transition-colors",
                    isSpeaking ? "border-green-500" : "border-transparent"
                  )}
                >
                  {hasVideo && videoTrack ? (
                    <VideoTrack
                      trackRef={videoTrack}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <div className="text-center">
                        <Avatar className="w-16 h-16 mx-auto mb-2">
                          <AvatarImage
                            src={
                              isLocal
                                ? undefined
                                : otherMember?.imageUrl || "/default-avatar.png"
                            }
                          />
                          <AvatarFallback>
                            {isLocal
                              ? "You"
                              : otherMember?.name?.charAt(0).toUpperCase() ||
                                "U"}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">
                          {isLocal ? "You" : participant.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Participant info overlay */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    <div className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                      {isLocal ? "You" : participant.name}
                    </div>
                    {!participant.isMicrophoneEnabled && (
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <MicOff className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={cn(
        "p-4 border-t border-border",
        hasScreenShare && screenShareTrack && "absolute bottom-2 w-full"
      )}>
        <div className="flex items-center justify-center gap-4">
          <ActionTooltip
            label={localParticipant.isMicrophoneEnabled ? "Mute" : "Unmute"}
          >
            <Button
              onClick={toggleMicrophone}
              variant={
                localParticipant.isMicrophoneEnabled
                  ? "secondary"
                  : "destructive"
              }
              size="lg"
              className="h-12 w-12 rounded-full p-0"
            >
              {localParticipant.isMicrophoneEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </Button>
          </ActionTooltip>

          <ActionTooltip
            label={
              localParticipant.isCameraEnabled
                ? "Turn off camera"
                : "Turn on camera"
            }
          >
            <Button
              onClick={toggleCamera}
              variant={
                localParticipant.isCameraEnabled ? "secondary" : "outline"
              }
              size="lg"
              className="h-12 w-12 rounded-full p-0"
            >
              {localParticipant.isCameraEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </Button>
          </ActionTooltip>

          <ActionTooltip
            label={
              localParticipant.isScreenShareEnabled
                ? "Stop sharing"
                : "Share screen"
            }
          >
            <Button
              onClick={toggleScreenShare}
              variant={
                localParticipant.isScreenShareEnabled ? "secondary" : "outline"
              }
              size="lg"
              className="h-12 w-12 rounded-full p-0"
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
              onClick={disconnectCall}
              variant="destructive"
              size="lg"
              className="h-12 w-12 rounded-full p-0"
            >
              <Phone className="h-5 w-5" />
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
};
