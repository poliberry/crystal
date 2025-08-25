"use client";

import { ChannelType, MemberRole } from "@prisma/client";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video, Crown, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { ServerHeader } from "./server-header";
import { EnhancedServerMember } from "./enhanced-server-member";
import { ServerSection } from "./server-section";
import { useSocket } from "../providers/socket-provider";

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
  const { socket } = useSocket();
  const [server, setServer] = useState(initialData);
  const [onlineMembers, setOnlineMembers] = useState<Set<string>>(new Set());
  const profile = currentProfile;

  useEffect(() => {
    if (!socket) return;

    const memberUpdateKey = `members:poll`;
    const userStatusKey = `user:status:update`;

    const handleMemberUpdate = async () => {
      const data = await fetch(`/api/servers/${serverId}/members`);
      const updatedServer = await data.json();
      setServer(updatedServer);
    };

    const handleUserStatus = (data: { userId: string; status: string }) => {
      setOnlineMembers(prev => {
        const newSet = new Set(prev);
        if (data.status === 'online' || data.status === 'idle' || data.status === 'dnd') {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    socket.on(memberUpdateKey, handleMemberUpdate);
    socket.on(userStatusKey, handleUserStatus);

    return () => {
      socket.off(memberUpdateKey, handleMemberUpdate);
      socket.off(userStatusKey, handleUserStatus);
    };
  }, [socket, serverId]);

  const members = server?.members || [];
  const role = server.members?.find(
    (member: any) => member.profileId === profile.id,
  )?.role;

  // Group members by their highest role
  const groupMembersByRole = (): RoleWithMembers[] => {
    const roleGroups: Record<string, RoleWithMembers> = {};
    
    // Initialize with server roles
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

    // Add default "Online" group for members without hoisted roles
    roleGroups['online'] = {
      role: {
        id: 'online',
        name: 'Online',
        color: '#99AAB5',
        position: -1,
        hoisted: true
      },
      members: [],
      onlineCount: 0
    };

    // Group members
    members.forEach((member: any) => {
      const memberRoles = member.roles || [];
      const hoistedRole = memberRoles
        .filter((r: any) => r.hoisted)
        .sort((a: any, b: any) => b.position - a.position)[0];

      const isOnline = onlineMembers.has(member.profile.userId);
      
      if (hoistedRole && roleGroups[hoistedRole.id]) {
        roleGroups[hoistedRole.id].members.push(member);
        if (isOnline) roleGroups[hoistedRole.id].onlineCount++;
      } else if (isOnline) {
        roleGroups['online'].members.push(member);
        roleGroups['online'].onlineCount++;
      }
    });

    // Filter out empty groups and sort by role position
    return Object.values(roleGroups)
      .filter(group => group.members.length > 0)
      .sort((a, b) => b.role.position - a.role.position);
  };

  const roleGroups = groupMembersByRole();
  const totalOnline = Array.from(onlineMembers).length;

  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent border-l border-muted">
      <div className="px-3 mt-2 border-b border-muted pb-2">
        <ServerSection
          sectionType="members"
          server={server}
          role={role}
          label={`Members — ${totalOnline}`}
        />
      </div>
      
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
                {group.members
                  .filter((member: any) => onlineMembers.has(member.profile.userId))
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
