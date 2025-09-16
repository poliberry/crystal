"use client";

import { MemberRole, type Member, type Profile, type Server } from "@prisma/client";
import { ShieldAlert, ShieldCheck, Crown, Hash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePusher } from "../providers/pusher-provider";
import { getDiscordPresence, getStatusDisplayText } from "@/lib/presence-utils";

import { cn } from "@/lib/utils";
import { UserAvatar } from "../user-avatar";
import { UserDialog } from "../user-dialog";
import { Badge } from "../ui/badge";
import { StatusIndicator } from "../ui/status-indicator";
import { UserStatus } from "@prisma/client";

type ServerMemberProps = {
  member: Member & { 
    profile: Profile;
    roles?: Array<{
      id: string;
      name: string;
      color: string;
      position: number;
    }>;
  };
  server: Server;
  profile: Profile | null;
};

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: (
    <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />
  ),
  [MemberRole.ADMIN]: <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />,
};

export const EnhancedServerMember = ({ member, profile, server }: ServerMemberProps) => {
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [status, setStatus] = useState<UserStatus>(member.profile.status || UserStatus.OFFLINE);
  const [presenceStatus, setPresenceStatus] = useState<string | null>(member.profile.presenceStatus);
  const { pusher, isConnected } = usePusher();
  
  // Listen for Pusher status updates
  useEffect(() => {
    if (!pusher || !isConnected) {
      console.log(`[ENHANCED_SERVER_MEMBER] No pusher connection available for ${member.profile.name}`);
      return;
    }

    console.log(`[ENHANCED_SERVER_MEMBER] Setting up Pusher listeners for ${member.profile.name} (${member.profile.userId})`);

    // Subscribe to the presence channel
    const channel = pusher.subscribe("presence");

    const handleStatusUpdate = (data: { userId: string; status: UserStatus; presenceStatus?: string }) => {
      console.log(`[ENHANCED_SERVER_MEMBER] ▶ Received user:status:update:`, data);
      console.log(`[ENHANCED_SERVER_MEMBER] ▶ Comparing userId: ${data.userId} === ${member.profile.userId}?`, data.userId === member.profile.userId);
      if (data.userId === member.profile.userId) {
        console.log(`[ENHANCED_SERVER_MEMBER] ✅ MATCH! Updating ${member.profile.name}: status=${data.status}, presenceStatus=${data.presenceStatus}`);
        if (data.status) {
          setStatus(data.status);
          console.log(`[ENHANCED_SERVER_MEMBER] ✅ Status updated to:`, data.status);
        }
        if (data.presenceStatus !== undefined) {
          setPresenceStatus(data.presenceStatus || null);
          console.log(`[ENHANCED_SERVER_MEMBER] ✅ Presence status updated to:`, data.presenceStatus);
        }
      }
    };

    const handlePresenceUpdate = (data: { userId: string; presenceStatus: string | null; status?: UserStatus }) => {
      console.log(`[ENHANCED_SERVER_MEMBER] ▶ Received user:presence:update:`, data);
      console.log(`[ENHANCED_SERVER_MEMBER] ▶ Comparing userId: ${data.userId} === ${member.profile.userId}?`, data.userId === member.profile.userId);
      if (data.userId === member.profile.userId) {
        console.log(`[ENHANCED_SERVER_MEMBER] ✅ MATCH! Updating ${member.profile.name}: status=${data.status}, presenceStatus=${data.presenceStatus}`);
        if (data.status) {
          setStatus(data.status);
          console.log(`[ENHANCED_SERVER_MEMBER] ✅ Status updated to:`, data.status);
        }
        if (data.presenceStatus !== undefined) {
          setPresenceStatus(data.presenceStatus);
          console.log(`[ENHANCED_SERVER_MEMBER] ✅ Presence status updated to:`, data.presenceStatus);
        }
      }
    };

    // Bind to Pusher events
    channel.bind("user:status:update", handleStatusUpdate);
    channel.bind("user:presence:update", handlePresenceUpdate);
    channel.bind("presence-status-update", handlePresenceUpdate);

    console.log(`[ENHANCED_SERVER_MEMBER] ✅ Pusher event listeners attached for ${member.profile.name}`);

    return () => {
      console.log(`[ENHANCED_SERVER_MEMBER] ❌ Cleaning up Pusher listeners for ${member.profile.name}`);
      channel.unbind("user:status:update", handleStatusUpdate);
      channel.unbind("user:presence:update", handlePresenceUpdate);
      channel.unbind("presence-status-update", handlePresenceUpdate);
      // Don't unsubscribe from channel as other components might be using it
    };
  }, [pusher, isConnected, member.profile.userId]);

  // Get presence information
  const presence = getDiscordPresence(
    status,
    presenceStatus
  );

  console.log(`[ENHANCED_SERVER_MEMBER] ${member.profile.name} current state:`, {
    status,
    presenceStatus,
    presence: presence.status,
    isOnline: presence.isOnline,
    customStatus: presence.customStatus
  });

  const onClick = () => {
    setShowUserDialog(true);
  };

  // Get the highest role for color display
  const getHighestRole = () => {
    if (!member.roles || member.roles.length === 0) return null;
    return member.roles.sort((a, b) => b.position - a.position)[0];
  };

  const highestRole = getHighestRole();
  const roleColor = highestRole?.color || "#99AAB5";
  const isOwner = server.profileId === member.profileId;

  return (
    <UserDialog profileId={member.profile.id} serverId={server.id}>
      <button
        onClick={onClick}
        className={cn(
          "group flex items-center gap-x-2 w-full p-2 transition mb-1 rounded-md hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50",
          "relative",
          !presence.isOnline && "opacity-60"
        )}
      >
        <div className="relative">
          <UserAvatar 
            src={member.profile.imageUrl} 
            alt={member.profile.name}
            className="h-8 w-8 md:h-8 md:w-8"
          />
          {/* Status indicator */}
          <div className="absolute -bottom-0.5 -right-0.5">
            <StatusIndicator status={presence.status} size="sm" />
          </div>
        </div>
        
        <div className="flex flex-col items-start min-w-0 flex-1">
          <div className="flex items-center gap-0 w-full">
            <p 
              className={cn(
                "font-semibold text-sm truncate w-full text-left",
                "transition-colors"
              )}
              style={{ 
                color: roleColor !== "#99AAB5" ? roleColor : undefined 
              }}
            >
              {member.profile.name}
            </p>
            
            {/* Owner crown */}
            {isOwner && (
              <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            )}
            
            {/* Legacy role icon (if no custom roles) */}
            {(!member.roles || member.roles.length === 0) && roleIconMap[member.role]}
          </div>
          
          {/* Custom status display */}
          {presence.customStatus && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-left">
              {presence.customStatus}
            </p>
          )}
        </div>
      </button>
    </UserDialog>
  );
};
