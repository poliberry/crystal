"use client";

import { Hash, Mic, ShieldAlert, ShieldCheck, Video, Crown, Users } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { usePusher } from "../providers/pusher-provider";
import { UserStatus, MemberRole, ChannelType } from "@/lib/types";
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

interface RoleGroup {
  role: {
    id: string;
    name: string;
    color: string;
    position: number;
    hoisted: boolean;
  };
  members: any[];
}

export const EnhancedMemberSidebar = ({ serverId, initialData, currentProfile }: EnhancedMemberSidebarProps) => {
  const { pusher, isConnected } = usePusher();
  
  // Early return if no server data
  if (!initialData) {
    return (
      <div className="flex flex-col h-full text-primary w-full bg-transparent border-l border-muted">
        <div className="p-4 text-center text-red-500">
          Server data not available
        </div>
      </div>
    );
  }

  // Core state - initialData is the server object directly
  const [server, setServer] = useState(initialData);
  const [members, setMembers] = useState(initialData?.members || []);
  const [profile] = useState(currentProfile);
  
  // Online members tracking - using array for reliable React updates
  const [onlineMemberIds, setOnlineMemberIds] = useState<string[]>([]);

  // Initialize online members on mount
  useEffect(() => {
    const initialOnlineMembers: string[] = [];
    
    members.forEach((member: any) => {
      const userId = member.profile?.user_id;
      if (userId && shouldShowInOnlineList(member.profile?.status, member.profile?.presence_status)) {
        initialOnlineMembers.push(userId);
      }
    });
    
    setOnlineMemberIds(initialOnlineMembers);
    console.log(`[DEBUG] Initialized online members:`, initialOnlineMembers);
  }, [members]);

  // Pusher event handlers
  useEffect(() => {
    if (!pusher || !isConnected || !serverId) return;

    const presenceChannel = pusher.subscribe(`presence-server-${serverId}`);
    
    const handleUserStatusUpdate = (data: any) => {
      console.log(`[DEBUG] Received status update:`, data);
      if (!data.userId) return;
      
      // Update member data
      setMembers((prevMembers: any[]) => 
        prevMembers.map((member: any) => {
          if (member.profile?.user_id === data.userId) {
            console.log(`[DEBUG] Updating ${member.profile?.name} status: ${member.profile?.status} -> ${data.status}`);
            return {
              ...member,
              profile: {
                ...member.profile,
                status: data.status,
                presence_status: data.presenceStatus || data.status
              }
            };
          }
          return member;
        })
      );

      // Update online status based on new presence
      const shouldBeOnline = shouldShowInOnlineList(
        data.status, 
        data.presenceStatus || data.status
      );
      
      console.log(`[DEBUG] User ${data.userId} should be online: ${shouldBeOnline}`);
      
      setOnlineMemberIds(prev => {
        const newArray = [...prev];
        if (shouldBeOnline) {
          if (!newArray.includes(data.userId)) {
            newArray.push(data.userId);
            console.log(`[DEBUG] Added ${data.userId} to online members`);
          }
        } else {
          const index = newArray.indexOf(data.userId);
          if (index > -1) {
            newArray.splice(index, 1);
            console.log(`[DEBUG] Removed ${data.userId} from online members`);
          }
        }
        console.log(`[DEBUG] Online members now:`, newArray);
        return newArray;
      });
    };

    const handlePresenceUpdate = (data: any) => {
      handleUserStatusUpdate(data); // Same logic for both events
    };

    presenceChannel.bind('user-status-update', handleUserStatusUpdate);
    presenceChannel.bind('presence-update', handlePresenceUpdate);

    return () => {
      presenceChannel.unbind('user-status-update', handleUserStatusUpdate);
      presenceChannel.unbind('presence-update', handlePresenceUpdate);
      pusher.unsubscribe(`presence-server-${serverId}`);
    };
  }, [pusher, isConnected, serverId]);

  // Group members by role hierarchy
  const groupedMembers = useMemo(() => {
    console.log(`[DEBUG] useMemo re-running with ${onlineMemberIds.length} online members:`, onlineMemberIds);
    
    const roleGroups: Record<string, RoleGroup> = {};
    
    // Initialize hoisted role groups
    if (server?.roles) {
      server.roles
        .filter((role: any) => role.hoisted)
        .forEach((role: any) => {
          roleGroups[role.id] = {
            role,
            members: []
          };
        });
    }

    // Create "Online" group for members without hoisted roles
    roleGroups['ONLINE'] = {
      role: {
        id: 'ONLINE',
        name: 'Online',
        color: '#00970dff',
        position: -1,
        hoisted: true
      },
      members: []
    };

    // Create "Offline" group for offline members without hoisted roles
    roleGroups['OFFLINE'] = {
      role: {
        id: 'OFFLINE',
        name: 'Offline',
        color: '#80848e',
        position: -2,
        hoisted: true
      },
      members: []
    };

    // Assign members to appropriate groups
    members.forEach((member: any) => {
      const userId = member.profile?.user_id;
      const isOnline = onlineMemberIds.includes(userId);
      const memberRoles = member.roles || [];
      
      console.log(`[DEBUG] Processing member ${member.profile?.name}: online=${isOnline}, status=${member.profile?.status}, roles=`, memberRoles.map((r: any) => r.name));
      
      // Find highest hoisted role
      const hoistedRole = memberRoles
        .filter((r: any) => r.hoisted)
        .sort((a: any, b: any) => b.position - a.position)[0];

      let targetGroupId: string;
      
      if (hoistedRole) {
        // Member has a hoisted role
        targetGroupId = hoistedRole.id;
        console.log(`[DEBUG] ${member.profile?.name} assigned to hoisted role: ${hoistedRole.name}`);
      } else {
        // Member has no hoisted roles, group by online status
        targetGroupId = isOnline ? 'ONLINE' : 'OFFLINE';
        console.log(`[DEBUG] ${member.profile?.name} assigned to special group: ${targetGroupId}`);
      }

      if (roleGroups[targetGroupId]) {
        roleGroups[targetGroupId].members.push(member);
      }
    });

    // Filter out empty groups and sort by position
    const result = Object.values(roleGroups)
      .filter(group => group.members.length > 0)
      .sort((a, b) => b.role.position - a.role.position);

    console.log(`[DEBUG] Final grouped result:`, result.map(g => ({ 
      name: g.role.name, 
      memberCount: g.members.length,
      memberNames: g.members.map((m: any) => m.profile?.name)
    })));

    return result;
  }, [members, onlineMemberIds, server?.roles]);

  // Separate online and offline members within hoisted role groups
  const renderRoleGroup = (group: RoleGroup) => {
    const onlineInGroup = group.members.filter((member: any) => 
      onlineMemberIds.includes(member.profile?.user_id)
    );
    const offlineInGroup = group.members.filter((member: any) => 
      !onlineMemberIds.includes(member.profile?.user_id)
    );

    const isSpecialGroup = group.role.id === 'ONLINE' || group.role.id === 'OFFLINE';

    return (
      <div key={group.role.id} className="space-y-2">
        {/* Role Header */}
        <div className="flex items-center gap-2 px-2 py-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: group.role.color }}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {group.role.name} — {isSpecialGroup ? group.members.length : onlineInGroup.length}
          </span>
        </div>

        {/* For special groups (ONLINE/OFFLINE), show all members */}
        {isSpecialGroup ? (
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
        ) : (
          <>
            {/* Online members in hoisted role */}
            {onlineInGroup.length > 0 && (
              <div className="space-y-[2px]">
                {onlineInGroup.map((member: any) => (
                  <EnhancedServerMember
                    key={member.id}
                    member={member}
                    profile={profile}
                    server={server}
                  />
                ))}
              </div>
            )}

            {/* Offline members in hoisted role */}
            {offlineInGroup.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 py-1 mt-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Offline — {offlineInGroup.length}
                  </span>
                </div>
                <div className="space-y-[2px]">
                  {offlineInGroup.map((member: any) => (
                    <EnhancedServerMember
                      key={member.id}
                      member={member}
                      profile={profile}
                      server={server}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent border-l border-muted">      
      <ScrollArea className="flex-1 px-3 shadow-md dark:bg-black bg-white rounded-xl">
        <div className="mt-2 space-y-4">
          {groupedMembers.map(renderRoleGroup)}
        </div>
      </ScrollArea>
    </div>
  );
};
