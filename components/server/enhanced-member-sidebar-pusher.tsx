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

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />,
  [MemberRole.ADMIN]: <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />,
};

interface EnhancedMemberSidebarProps {
  serverId: string;
  initialData: any;
  currentProfile: any;
}

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

  // Initialize online members based on server data
  useEffect(() => {
    if (!server?.members) return;

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

  // Pusher event listeners
  useEffect(() => {
    if (!pusher || !isConnected) {
      console.log(`[ENHANCED_MEMBER_SIDEBAR] No pusher connection available`);
      return;
    }

    console.log(`[ENHANCED_MEMBER_SIDEBAR] Setting up Pusher listeners for presence events`);

    // Subscribe to the presence channel
    const channel = pusher.subscribe("presence");

    const handleMemberUpdate = async () => {
      console.log(`[ENHANCED_MEMBER_SIDEBAR] Members poll event received`);
      try {
        const response = await fetch(`/api/servers/${serverId}/members`);
        const updatedServer = await response.json();
        setServer(updatedServer);
      } catch (error) {
        console.error("Failed to update members:", error);
      }
    };

    const handleUserStatusUpdate = (data: { userId: string; status: UserStatus; presenceStatus?: string; prevStatus?: UserStatus }) => {
      console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Received user:status:update:`, data);
      setOnlineMembers(prev => {
        const newMap = new Map(prev);
        
        // Use presence logic to determine if user should be online
        const presence = getDiscordPresence(
          data.status,
          data.presenceStatus || null
        );
        
        console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ User ${data.userId} presence:`, presence);
        
        if (presence.isOnline) {
          newMap.set(data.userId, presence.status);
          console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Added ${data.userId} to online list`);
        } else {
          newMap.delete(data.userId);
          console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Removed ${data.userId} from online list`);
        }
        
        console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Updated online members:`, Array.from(newMap.keys()));
        return newMap;
      });
    };

    const handlePresenceUpdate = (data: { userId: string; presenceStatus: string | null; status?: UserStatus; prevStatus?: UserStatus }) => {
      console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Received presence update:`, data);
      setOnlineMembers(prev => {
        const newMap = new Map(prev);
        
        // Use presence logic to determine if user should be online
        const presence = getDiscordPresence(
          data.status || UserStatus.OFFLINE,
          data.presenceStatus
        );
        
        console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ User ${data.userId} presence:`, presence);
        
        if (presence.isOnline) {
          newMap.set(data.userId, presence.status);
          console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Added ${data.userId} to online list`);
        } else {
          newMap.delete(data.userId);
          console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Removed ${data.userId} from online list`);
        }
        
        console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Updated online members:`, Array.from(newMap.keys()));
        return newMap;
      });
    };

    // Bind to Pusher events
    channel.bind("members:poll", handleMemberUpdate);
    channel.bind("user:status:update", handleUserStatusUpdate);
    channel.bind("user:presence:update", handlePresenceUpdate);
    channel.bind("presence-status-update", handlePresenceUpdate);

    return () => {
      channel.unbind("members:poll", handleMemberUpdate);
      channel.unbind("user:status:update", handleUserStatusUpdate);
      channel.unbind("user:presence:update", handlePresenceUpdate);
      channel.unbind("presence-status-update", handlePresenceUpdate);
      // Don't unsubscribe from channel as other components might be using it
    };
  }, [pusher, isConnected, serverId]);

  const members = server?.members || [];
  const role = server.members?.find(
    (member: any) => member.profileId === profile.id,
  )?.role;

  // Debug logging
  console.log(`[ENHANCED_MEMBER_SIDEBAR] Current state:`, {
    totalMembers: members.length,
    onlineMembersCount: onlineMembers.size,
    onlineUserIds: Array.from(onlineMembers.keys()),
    allMemberUserIds: members.map((m: any) => m.profile?.userId),
    sampleMember: members[0] ? {
      name: members[0].profile?.name,
      userId: members[0].profile?.userId,
      status: members[0].profile?.status
    } : null
  });

  // Group members by their highest role with proper Discord-like categorization
  const groupMembersByRole = (): RoleWithMembers[] => {
    console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Grouping ${members.length} members by role`);
    console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Members:`, members.map((m: any) => ({ name: m.profile?.name, userId: m.profile?.userId, status: m.profile?.status })));
    
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

    // Group members based on their roles (show all members, not just online ones)
    members.forEach((member: any) => {
      const memberRoles = member.roles || [];
      const hoistedRole = memberRoles
        .filter((r: any) => r.hoisted)
        .sort((a: any, b: any) => b.position - a.position)[0];

      const userId = member.profile?.userId;
      const isOnline = onlineMembers.has(userId);

      console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Processing member ${member.profile?.name} (${userId}): online=${isOnline}`);

      // Add ALL members to role groups, regardless of online status
      const targetGroupId = hoistedRole ? hoistedRole.id : 'ONLINE';
      
      if (roleGroups[targetGroupId]) {
        roleGroups[targetGroupId].members.push(member);
        // Only count online members for the header display
        if (isOnline) {
          roleGroups[targetGroupId].onlineCount += 1;
        }
        console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Added ${member.profile?.name} to group ${targetGroupId}`);
      }
    });

    // Filter out empty groups and sort by role position (highest first)
    // Show ALL groups with members, regardless of online status
    const result = Object.values(roleGroups)
      .filter(group => group.members.length > 0)
      .sort((a, b) => b.role.position - a.role.position);
      
    console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Final role groups:`, result.map(g => ({ 
      name: g.role.name, 
      memberCount: g.members.length, 
      onlineCount: g.onlineCount,
      members: g.members.map((m: any) => m.profile?.name)
    })));
    
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
          {roleGroups.map((group) => {
            console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Rendering role group ${group.role.name} with ${group.members.length} members`);

            return (
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
                
                {/* All Members in this role */}
                <div className="space-y-[2px]">
                  {group.members.map((member: any) => {
                    const isOnline = onlineMembers.has(member.profile?.userId);
                    console.log(`[ENHANCED_MEMBER_SIDEBAR] ▶ Rendering member ${member.profile?.name}: online=${isOnline}`);
                    
                    return (
                      <EnhancedServerMember
                        key={member.id}
                        member={member}
                        profile={profile}
                        server={server}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
