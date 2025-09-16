"use client";

import { ChannelType, MemberRole } from "@prisma/client";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video, Crown, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { usePusher } from "../providers/pusher-provider";
import { UserStatus } from "@prisma/client";
import { getDiscordPresence, shouldShowInOnlineList } from "@/lib/presence-utils";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { ServerHeader } from "./server-header";
import { EnhancedServerMember } from "./enhanced-server-member";
import { ServerSection } from "./server-section";

type EnhancedMemberSidebarProps = {
  serverId: string;
  initialData: any;
  currentProfile: any;
};

const iconMap = {
  [ChannelType.TEXT]: <Hash className="mr-2 h-4 w-4" />,
  [ChannelType.AUDIO]: <Mic className="mr-2 h-4 w-4" />,
  [ChannelType.VIDEO]: <Video className="mr-2 h-4 w-4" />,
};

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: (
    <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />
  ),
  [MemberRole.ADMIN]: <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />,
};

interface RoleWithMembers {
  role: {
    id: string;
    name: string;
    color: string;
    position: number;
    hoisted: boolean;
  };
  members: any[];
  onlineCount: number;
}

export const EnhancedMemberSidebar = ({ serverId, initialData, currentProfile }: EnhancedMemberSidebarProps) => {
  const { pusher, isConnected } = usePusher();
  const [server, setServer] = useState(initialData);
  const [onlineMembers, setOnlineMembers] = useState<Map<string, UserStatus>>(new Map());
  const profile = currentProfile;

  console.log(`[ENHANCED_MEMBER_SIDEBAR] Component rendered. Server ID: ${serverId}`);
  console.log(`[ENHANCED_MEMBER_SIDEBAR] Initial data:`, initialData);
  console.log(`[ENHANCED_MEMBER_SIDEBAR] Server state:`, server);
  console.log(`[ENHANCED_MEMBER_SIDEBAR] Server members:`, server?.members);
  console.log(`[ENHANCED_MEMBER_SIDEBAR] Members count:`, server?.members?.length || 0);
  console.log(`[ENHANCED_MEMBER_SIDEBAR] Online members size:`, onlineMembers.size);

  // Initialize online members from server data
  useEffect(() => {
    if (!server?.members) {
      console.log(`[ENHANCED_MEMBER_SIDEBAR] No server members found`);
      return;
    }
    
    const initialOnline = new Map<string, UserStatus>();

    server.members.forEach((member: any) => {
      const profile = member.profile;
      if (!profile) return;
      
      // Use presence logic to determine if user should be considered online
      const presence = getDiscordPresence(
        profile.status,
        profile.presenceStatus
      );
      
      if (presence.isOnline) {
        initialOnline.set(profile.userId, presence.status);
      }
    });
    
    setOnlineMembers(initialOnline);
  }, [server?.members]);

  useEffect(() => {
    if (!pusher || !isConnected) {
      console.log(`[ENHANCED_MEMBER_SIDEBAR] No pusher connection available`);
      return;
    }

    console.log(`[ENHANCED_MEMBER_SIDEBAR] Setting up Pusher listeners for presence events`);

    const memberUpdateKey = `members:poll`;
    const userStatusKey = `user:status:update`;
    const presenceUpdateKey = `user:presence:update`;

    const handleMemberUpdate = async () => {
      try {
        const response = await fetch(`/api/servers/${serverId}/members`);
        const updatedServer = await response.json();
        setServer(updatedServer);
      } catch (error) {
        console.error("Failed to update members:", error);
      }
    };

    const handleUserStatusUpdate = (data: { userId: string; status: UserStatus; presenceStatus?: string; prevStatus?: UserStatus }) => {
      setOnlineMembers(prev => {
        const newMap = new Map(prev);
        
        // Use presence logic to determine if user should be online
        const presence = getDiscordPresence(
          data.status,
          data.presenceStatus || null
        );
        
        if (presence.isOnline) {
          newMap.set(data.userId, presence.status);
        } else {
          newMap.delete(data.userId);
        }
        
        return newMap;
      });
    };

    const handlePresenceUpdate = (data: { userId: string; presenceStatus: string | null; status?: UserStatus; prevStatus?: UserStatus }) => {
      console.log(`[MEMBER_SIDEBAR] Presence update for user ${data.userId}:`, data);
      
      setOnlineMembers(prev => {
        const newMap = new Map(prev);
        
        // Get current status for this user (or use provided status)
        const currentStatus = data.status || prev.get(data.userId) || UserStatus.ONLINE;
        
        // Use presence logic to determine if user should be online
        const presence = getDiscordPresence(
          currentStatus,
          data.presenceStatus  // This is the custom status message
        );
        
        console.log(`[MEMBER_SIDEBAR] Presence info for ${data.userId}:`, presence);
        
        if (presence.isOnline) {
          newMap.set(data.userId, presence.status);
        } else {
          newMap.delete(data.userId);
        }
        
        return newMap;
      });
    };

    socket.on(memberUpdateKey, handleMemberUpdate);
    socket.on(userStatusKey, handleUserStatusUpdate);
    socket.on(presenceUpdateKey, handlePresenceUpdate);
    // Also listen to alternative event names for compatibility
    socket.on("user-status-change", handleUserStatusUpdate);
    socket.on("presence-status-update", handlePresenceUpdate);

    return () => {
      socket.off(memberUpdateKey, handleMemberUpdate);
      socket.off(userStatusKey, handleUserStatusUpdate);
      socket.off(presenceUpdateKey, handlePresenceUpdate);
      socket.off("user-status-change", handleUserStatusUpdate);
      socket.off("presence-status-update", handlePresenceUpdate);
    };
  }, [socket, serverId]);

  const members = server?.members || [];
  const role = server.members?.find(
    (member: any) => member.profileId === profile.id,
  )?.role;

  // Debug logging
  console.log(`[ENHANCED_MEMBER_SIDEBAR] Current state:`, {
    totalMembers: members.length,
    onlineMembersCount: onlineMembers.size,
    onlineUserIds: Array.from(onlineMembers.keys()),
    sampleMember: members[0] ? {
      name: members[0].profile?.name,
      userId: members[0].profile?.userId,
      status: members[0].profile?.status
    } : null
  });

  // Group members by their highest role with proper Discord-like categorization
  const groupMembersByRole = (): RoleWithMembers[] => {
    const roleGroups: Record<string, RoleWithMembers> = {};
    
    // Initialize with server roles that are hoisted
    if (server?.roles) {
      server.roles.forEach((role: any) => {
        if (role.hoisted) {
          roleGroups[role.id] = {
            role,
            members: [],
            onlineCount: 0
          };
        }
      });
    }

    // Add default "Online" group for members without hoisted roles or with unhoisted roles
    roleGroups['ONLINE'] = {
      role: {
        id: 'ONLINE',
        name: 'Online',
        color: '#00970dff',
        position: -1,
        hoisted: true
      },
      members: [],
      onlineCount: 0
    };

    // Group members based on their online status and highest hoisted role
    members.forEach((member: any) => {
      const memberRoles = member.roles || [];
      const hoistedRole = memberRoles
        .filter((r: any) => r.hoisted)
        .sort((a: any, b: any) => b.position - a.position)[0];

      const userId = member.profile?.userId;
      const isOnline = onlineMembers.has(userId);
      
      console.log(`[ENHANCED_MEMBER_SIDEBAR] Member ${member.profile?.name} (${userId}): isOnline=${isOnline}, hoistedRole=${hoistedRole?.name || 'none'}`);
      
      // Only show online members in role categories
      if (isOnline) {
        if (hoistedRole && roleGroups[hoistedRole.id]) {
          // Member has a hoisted role and is online - put in role category
          roleGroups[hoistedRole.id].members.push(member);
          roleGroups[hoistedRole.id].onlineCount++;
          console.log(`[ENHANCED_MEMBER_SIDEBAR] Added ${member.profile?.name} to role group ${hoistedRole.name}`);
        } else {
          // Member has no hoisted roles or only unhoisted roles - put in Online category
          roleGroups['ONLINE'].members.push(member);
          roleGroups['ONLINE'].onlineCount++;
          console.log(`[ENHANCED_MEMBER_SIDEBAR] Added ${member.profile?.name} to Online group`);
        }
      } else {
        console.log(`[ENHANCED_MEMBER_SIDEBAR] ${member.profile?.name} is not online, skipping`);
      }
    });

    // Filter out empty groups and sort by role position (highest first)
    // Temporarily show all groups with members, regardless of online status
    const result = Object.values(roleGroups)
      .filter(group => group.members.length > 0)
      .sort((a, b) => b.role.position - a.role.position);
      
    console.log(`[ENHANCED_MEMBER_SIDEBAR] Final role groups:`, result.map(g => ({ name: g.role.name, memberCount: g.members.length, onlineCount: g.onlineCount })));
    
    return result;
  };

  const roleGroups = groupMembersByRole();
  const totalOnline = onlineMembers.size;

  console.log(`[ENHANCED_MEMBER_SIDEBAR] Rendering with ${totalOnline} online members:`, Array.from(onlineMembers.keys()));
  console.log(`[ENHANCED_MEMBER_SIDEBAR] Role groups:`, roleGroups.map(g => ({ name: g.role.name, memberCount: g.members.length, onlineCount: g.onlineCount })));

  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent border-l border-muted">      
      <ScrollArea className="flex-1 px-3 shadow-md dark:bg-black bg-white rounded-xl">
        <div className="mt-2 space-y-4">
          {roleGroups.map((group) => (
            <div key={group.role.id} className="space-y-2">
              {/* Role Header */}
              <div className="flex items-center gap-2 px-2 py-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.role.color }}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {group.role.name} — {group.onlineCount}
                </span>
              </div>
              
              {/* Members in this role */}
              <div className="space-y-[2px]">
                {group.members.map((member: any) => (
                  <EnhancedServerMember
                    key={member.id}
                    member={member}
                    profile={profile}
                    server={server}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Offline Members Section */}
          {members.some((member: any) => !onlineMembers.has(member.profile.userId)) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Offline — {members.length - totalOnline}
                </span>
              </div>
              
              <div className="space-y-[2px]">
                {members
                  .filter((member: any) => !onlineMembers.has(member.profile.userId))
                  .map((member: any) => (
                    <EnhancedServerMember
                      key={member.id}
                      member={member}
                      profile={profile}
                      server={server}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
