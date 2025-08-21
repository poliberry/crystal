"use client";

import { useEffect, useState } from "react";
import {
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { type Channel, type Server, type Member, type MemberRole } from "@prisma/client";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Mic, MicOff, Hand, Users, Crown, Shield, UserCheck, UserX, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StageJoinScreen } from "./stage-join-screen";
import { hasPermission, ServerPermission, canRequestToSpeak, canManageStage } from "@/lib/server-permissions";
import { useLiveKit } from "./providers/media-room-provider";
import { useSocket } from "./providers/socket-provider";

interface StageRoomProps {
  channel: Channel;
  server: Server;
  member: Member;
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: string;
  paramValue: string;
}

export const StageRoom = ({
  channel,
  server,
  member,
  chatId,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
}: StageRoomProps) => {
  const media = useLiveKit();
  const { socket } = useSocket();
  const [connecting, setConnecting] = useState(false);
  const [pendingSpeakerRequests, setPendingSpeakerRequests] = useState<string[]>([]);
  const [userDisconnected, setUserDisconnected] = useState(false);

  const userPermissions = {
    canRequestToSpeak: canRequestToSpeak(member.role),
    canManageStage: canManageStage(member.role),
  };

  // Handle manual join to stage
  const handleJoinStage = async () => {
    setConnecting(true);
    setUserDisconnected(false);
    try {
      await media.join(
        channel.id,
        channel.name,
        server.name,
        server.id,
        "channel",
        true, // audio enabled
        false, // video disabled for stage
      );
    } catch (error) {
      console.error("Failed to connect to stage room:", error);
    } finally {
      setConnecting(false);
    }
  };

  // Handle disconnection events and socket room joining
  useEffect(() => {
    if (!socket) return;

    // Join the stage channel room for real-time updates
    const channelKey = `channel:${channel.id}:stage`;
    socket.emit("join", channelKey);

    const handleDisconnect = () => {
      setUserDisconnected(true);
    };

    const handleStageUpdate = (data: any) => {
      if (data.channelId === channel.id) {
        // Update pending speaker requests
        if (data.type === "speaker-request") {
          setPendingSpeakerRequests(prev => [...prev, data.userId]);
        } else if (data.type === "speaker-approved" || data.type === "speaker-removed") {
          setPendingSpeakerRequests(prev => prev.filter(id => id !== data.userId));
        } else if (data.type === "stage-updated") {
          // Refresh pending requests
          setPendingSpeakerRequests(data.pendingRequests || []);
        }
      }
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("stage:update", handleStageUpdate);
    socket.on("room:disconnect", handleDisconnect);

    return () => {
      socket.emit("leave", channelKey);
      socket.off("disconnect", handleDisconnect);
      socket.off("stage:update", handleStageUpdate);
      socket.off("room:disconnect", handleDisconnect);
    };
  }, [socket, channel.id]);

  // Check if user should see join screen
  const shouldShowJoinScreen = !media.connected || 
                              media.roomId !== channel.id || 
                              userDisconnected || 
                              connecting;

  if (shouldShowJoinScreen) {
    return (
      <StageJoinScreen
        channel={channel}
        server={server}
        onJoin={handleJoinStage}
        isConnecting={connecting}
      />
    );
  }

  // If connected to the stage room, show the stage content
  return (
    <StageContent 
      channel={channel} 
      member={member}
      userPermissions={userPermissions}
    />
  );
};

function StageContent({ 
  channel, 
  member, 
  userPermissions 
}: { 
  channel: Channel; 
  member: Member;
  userPermissions: {
    canRequestToSpeak: boolean;
    canManageStage: boolean;
  };
}) {
  const { socket } = useSocket();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [requestedToSpeak, setRequestedToSpeak] = useState(false);
  const [pendingSpeakerRequests, setPendingSpeakerRequests] = useState<string[]>([]);

  // Listen for WebSocket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Join the stage channel room for real-time updates
    const channelKey = `channel:${channel.id}:stage`;
    socket.emit("join", channelKey);

    const handleStageUpdate = (data: any) => {
      if (data.channelId === channel.id) {
        switch (data.type) {
          case "speaker-request":
            setPendingSpeakerRequests(prev => [...prev, data.userId]);
            break;
          case "speaker-approved":
            setPendingSpeakerRequests(prev => prev.filter(id => id !== data.userId));
            if (data.userId === localParticipant.identity) {
              setIsHandRaised(false);
              setRequestedToSpeak(false);
            }
            break;
          case "speaker-removed":
            setPendingSpeakerRequests(prev => prev.filter(id => id !== data.userId));
            break;
          case "speaker-stepped-down":
            if (data.userId === localParticipant.identity) {
              // Handle visual feedback for stepping down
            }
            break;
          case "stage-updated":
            setPendingSpeakerRequests(data.pendingRequests || []);
            break;
        }
      }
    };

    socket.on("stage:update", handleStageUpdate);

    return () => {
      socket.emit("leave", channelKey);
      socket.off("stage:update", handleStageUpdate);
    };
  }, [socket, channel.id, localParticipant.identity]);

  // Categorize participants based on their speaking permissions
  const speakers = participants.filter((p) => {
    // In a real implementation, you would check LiveKit participant permissions
    // For now, we'll simulate this based on metadata or participant properties
    const metadata = p.metadata ? JSON.parse(p.metadata) : {};
    return metadata.isSpeaker === true || p.permissions?.canPublish || p.identity === localParticipant.identity;
  });
  
  const audience = participants.filter((p) => {
    const metadata = p.metadata ? JSON.parse(p.metadata) : {};
    return metadata.isSpeaker !== true && !p.permissions?.canPublish && p.identity !== localParticipant.identity;
  });

  const canSpeak = localParticipant.permissions?.canPublish ?? false;
  const isSpeaker = speakers.some(p => p.identity === localParticipant.identity);

  const toggleMute = () => {
    localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  };

  const requestToSpeak = async () => {
    if (!userPermissions.canRequestToSpeak) {
      return;
    }

    try {
      const response = await fetch("/api/socket/stage", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'request_to_speak',
          channelId: channel.id,
        }),
      });

      if (response.ok) {
        setIsHandRaised(true);
        setRequestedToSpeak(true);
      }
    } catch (error) {
      console.error('Failed to request to speak:', error);
    }
  };

  const approveSpeaker = async (participantId: string) => {
    if (!userPermissions.canManageStage) return;

    try {
      const response = await fetch("/api/socket/stage", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve_speaker',
          targetUserId: participantId,
          channelId: channel.id,
        }),
      });

      if (response.ok) {
        setPendingSpeakerRequests(prev => prev.filter(id => id !== participantId));
      }
    } catch (error) {
      console.error('Failed to approve speaker:', error);
    }
  };

  const removeSpeaker = async (participantId: string) => {
    if (!userPermissions.canManageStage) return;

    try {
      const response = await fetch("/api/socket/stage", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove_speaker',
          targetUserId: participantId,
          channelId: channel.id,
        }),
      });

      if (response.ok) {
        // Speaker removed successfully
      }
    } catch (error) {
      console.error('Failed to remove speaker:', error);
    }
  };

  const stepDownFromStage = async () => {
    if (!userPermissions.canManageStage) return;

    try {
      const response = await fetch("/api/socket/stage", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'step_down',
          channelId: channel.id,
        }),
      });

      if (response.ok) {
        console.log('Stepped down from stage');
      }
    } catch (error) {
      console.error('Failed to step down from stage:', error);
    }
  };

  const getRoleIcon = (memberRole: MemberRole) => {
    switch (memberRole) {
      case 'ADMIN':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'MODERATOR':
        return <Shield className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  if (connectionState !== ConnectionState.Connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">LIVE</span>
            </div>
            <h2 className="text-lg font-semibold">{channel.name}</h2>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Mic className="w-4 h-4" />
              <span>{speakers.length} speakers</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{audience.length} audience</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Area */}
      <div className="flex-1 flex flex-col">
        {/* Speakers Section */}
        <div className="flex-1 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Speakers ({speakers.length})
            </h3>
            {userPermissions.canManageStage && pendingSpeakerRequests.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingSpeakerRequests.length} pending requests
              </Badge>
            )}
          </div>
          
          {speakers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {speakers.map((participant) => {
                const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
                return (
                  <div
                    key={participant.sid}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-lg border bg-card relative",
                      participant.isSpeaking && "ring-2 ring-green-500"
                    )}
                  >
                    {/* Role indicator */}
                    <div className="absolute top-2 right-2">
                      {getRoleIcon(member.role)}
                    </div>

                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      {metadata.avatar ? (
                        <img 
                          src={metadata.avatar} 
                          alt={participant.identity}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">
                          {participant.identity.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium text-center">{participant.identity}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {participant.isMicrophoneEnabled ? (
                        <Mic className="w-3 h-3 text-green-500" />
                      ) : (
                        <MicOff className="w-3 h-3 text-red-500" />
                      )}
                      {participant.isSpeaking && (
                        <Badge variant="secondary" className="text-xs">
                          Speaking
                        </Badge>
                      )}
                    </div>

                    {/* Management buttons for moderators */}
                    {userPermissions.canManageStage && participant.identity !== localParticipant.identity && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeSpeaker(participant.identity)}
                          className="text-xs"
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p>No speakers on stage</p>
            </div>
          )}
        </div>

        {/* Audience Section */}
        {audience.length > 0 && (
          <div className="border-t border-border p-4 max-h-32 overflow-y-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Audience ({audience.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {audience.map((participant) => {
                const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
                return (
                  <div
                    key={participant.sid}
                    className="flex items-center gap-2 px-3 py-1 rounded-md bg-secondary text-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      {metadata.avatar ? (
                        <img 
                          src={metadata.avatar} 
                          alt={participant.identity}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs">
                          {participant.identity.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span>{participant.identity}</span>
                    
                    {/* Show hand raised if pending */}
                    {pendingSpeakerRequests.includes(participant.identity) && (
                      <div className="flex items-center gap-1">
                        <Hand className="w-3 h-3 text-yellow-500" />
                        {userPermissions.canManageStage && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveSpeaker(participant.identity)}
                            className="text-xs ml-1"
                          >
                            <UserCheck className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-center gap-4">
          {isSpeaker ? (
            <div className="flex items-center gap-3">
              <Button
                onClick={toggleMute}
                variant={localParticipant.isMicrophoneEnabled ? "default" : "secondary"}
                size="lg"
                className="flex items-center gap-2"
              >
                {localParticipant.isMicrophoneEnabled ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
                {localParticipant.isMicrophoneEnabled ? "Mute" : "Unmute"}
              </Button>
              
              {/* Allow moderators to step down from stage */}
              {userPermissions.canManageStage && (
                <Button
                  onClick={stepDownFromStage}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <ArrowDown className="w-4 h-4" />
                  Step Down
                </Button>
              )}
            </div>
          ) : userPermissions.canRequestToSpeak ? (
            <Button
              onClick={requestToSpeak}
              variant={isHandRaised ? "default" : "outline"}
              size="lg"
              className="flex items-center gap-2"
              disabled={requestedToSpeak}
            >
              <Hand className="w-4 h-4" />
              {isHandRaised ? "Lower Hand" : "Raise Hand"}
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              You don't have permission to speak in this stage
            </div>
          )}
        </div>
        
        {requestedToSpeak && !isSpeaker && (
          <div className="mt-2 text-center">
            <Badge variant="secondary">
              Hand raised - waiting for moderator approval
            </Badge>
          </div>
        )}

        {/* Permission info */}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {isSpeaker 
            ? "You are a speaker in this stage"
            : "You are in the audience"
          }
          {userPermissions.canManageStage && (
            <span className="ml-2 text-blue-400">• Stage Moderator</span>
          )}
        </div>
      </div>
    </div>
  );
};
