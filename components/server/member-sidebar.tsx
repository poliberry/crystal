"use client";

import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { ServerChannel } from "./server-channel";
import { ServerHeader } from "./server-header";
import { ServerMember } from "./server-member";
import { ServerSearch } from "./server-search";
import { ServerSection } from "./server-section";

type ServerSidebarProps = {
  serverId: string;
  initialData: any;
  currentProfile: any;
};

const iconMap = {
  ["TEXT"]: <Hash className="mr-2 h-4 w-4" />,
  ["AUDIO"]: <Mic className="mr-2 h-4 w-4" />,
  ["VIDEO"]: <Video className="mr-2 h-4 w-4" />,
};

const roleIconMap = {
  ["GUEST"]: null,
  ["MODERATOR"]: <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />,
  ["ADMIN"]: <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />,
};

export const MemberSidebar = ({
  serverId,
  initialData,
  currentProfile,
}: ServerSidebarProps) => {
  const { user } = useAuthStore();
  // Get real-time server data from Convex
  const server =
    useQuery(
      api.servers.getById,
      serverId ? { serverId: serverId as any } : "skip"
    ) || initialData;

  // Get roles for this server
  const roles = useQuery(
    api.roles.getByServerId,
    serverId ? { serverId: serverId as any } : "skip"
  ) || [];

  const profile = currentProfile;

  const members = server?.members || [];
  const profileId = profile?._id || profile?.id;
  const currentMember = members.find(
    (member: any) =>
      (member.profileId || member.profile?._id || member.profile?.id) ===
      profileId
  );
  
  const role = currentMember?.role;
  const roleId = currentMember?.roleId;

  // Helper function to get all roles for a member
  const getMemberRoles = (member: any) => {
    const roleIds = member.roleIds || (member.roleId ? [member.roleId] : []);
    return member.roles || roleIds.map((id: string) => roles.find((r: any) => r._id === id)).filter(Boolean);
  };

  // Helper function to get highest role (by position) for a member
  const getHighestRole = (member: any) => {
    const memberRoles = getMemberRoles(member);
    if (memberRoles.length === 0) {
      // Fallback to legacy role
      const roleOrder: Record<string, number> = { ADMIN: 3, MODERATOR: 2, GUEST: 1 };
      return { position: roleOrder[member.role] || 0, role: member.role, isLegacy: true };
    }
    return memberRoles.reduce((highest: any, current: any) => {
      if (!highest || (current.position > highest.position)) {
        return current;
      }
      return highest;
    }, null);
  };

  // Helper function to get hoisted role for a member (first hoisted role found, or null)
  const getHoistedRole = (member: any) => {
    const memberRoles = getMemberRoles(member);
    // Sort by position descending to check highest hoisted role first
    const sortedRoles = [...memberRoles].sort((a: any, b: any) => b.position - a.position);
    return sortedRoles.find((r: any) => r.hoist) || null;
  };

  // Helper function to check if member is online
  const isMemberOnline = (member: any) => {
    const status = member.profile?.status || "OFFLINE";
    return status !== "OFFLINE" && status !== "INVISIBLE";
  };

  // Group members by hoisted roles and online/offline status
  const groupedMembers = useMemo(() => {
    const groups: Record<string, { role: any; members: any[]; onlineCount: number }> = {};
    const onlineMembers: any[] = [];
    const offlineMembers: any[] = [];

    members
      .filter((member: any) => member.profile) // Filter out members without profile data
      .forEach((member: any) => {
        const hoistedRole = getHoistedRole(member);
        const highestRole = getHighestRole(member);
        const isOnline = isMemberOnline(member);

        // Offline and invisible members always go to Offline section
        if (!isOnline) {
          offlineMembers.push({ ...member, highestRole, hoistedRole });
          return;
        }

        // Online members are grouped by hoisted roles
        if (hoistedRole) {
          // Member has a hoisted role - group by that role
          const roleKey = hoistedRole._id;
          if (!groups[roleKey]) {
            groups[roleKey] = {
              role: hoistedRole,
              members: [],
              onlineCount: 0,
            };
          }
          groups[roleKey].members.push({ ...member, highestRole, hoistedRole });
          groups[roleKey].onlineCount++;
        } else {
          // Member has no hoisted role - group in Online section
          onlineMembers.push({ ...member, highestRole });
        }
      });

    // Sort members within each group by highest role position
    Object.values(groups).forEach((group) => {
      group.members.sort((a: any, b: any) => {
        const posA = a.highestRole?.position || 0;
        const posB = b.highestRole?.position || 0;
        return posB - posA;
      });
    });

    onlineMembers.sort((a: any, b: any) => {
      const posA = a.highestRole?.position || 0;
      const posB = b.highestRole?.position || 0;
      return posB - posA;
    });

    offlineMembers.sort((a: any, b: any) => {
      const posA = a.highestRole?.position || 0;
      const posB = b.highestRole?.position || 0;
      return posB - posA;
    });

    // Sort hoisted role groups by index (lowest first, as index represents hierarchy order)
    // If index is not set, fall back to position
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const indexA = a.role.index !== undefined ? a.role.index : a.role.position;
      const indexB = b.role.index !== undefined ? b.role.index : b.role.position;
      return indexA - indexB;
    });

    return { hoistedGroups: sortedGroups, onlineMembers, offlineMembers };
  }, [members, roles]);

  return (
    <div className="flex flex-col h-full text-primary w-full px-4 pb-2 bg-transparent">
      <div className="pb-2">
        <ServerSection
          sectionType="members"
          server={server}
          role={role}
          label="Members"
        />
      </div>
      <ScrollArea className="flex-1 w-full">
        <div className="mb-2 w-full">
          {/* Hoisted role groups */}
          {groupedMembers.hoistedGroups.map((group) => (
            <div key={group.role._id} className="mb-4">
              <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {group.role.name}
                  </p>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {group.onlineCount}
                </span>
              </div>
              <div className="w-full">
                {group.members.map((member: any) => {
                  const memberId = member._id || member.id;
                  return (
                    <ServerMember
                      key={memberId}
                      member={{
                        ...member,
                        roleData: member.highestRole, // Pass highest role for color
                        hoistedRole: member.hoistedRole,
                      }}
                      profile={profile}
                      server={server}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Online members (non-hoisted) */}
          {groupedMembers.onlineMembers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between py-2 px-1">
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  Online — {groupedMembers.onlineMembers.length}
                </p>
              </div>
              <div className="w-full">
                {groupedMembers.onlineMembers.map((member: any) => {
                  const memberId = member._id || member.id;
                  return (
                    <ServerMember
                      key={memberId}
                      member={{
                        ...member,
                        roleData: member.highestRole, // Pass highest role for color
                      }}
                      profile={profile}
                      server={server}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Offline members (non-hoisted) */}
          {groupedMembers.offlineMembers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between py-2 px-1">
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  Offline — {groupedMembers.offlineMembers.length}
                </p>
              </div>
              <div className="w-full">
                {groupedMembers.offlineMembers.map((member: any) => {
                  const memberId = member._id || member.id;
                  return (
                    <ServerMember
                      key={memberId}
                      member={{
                        ...member,
                        roleData: member.highestRole, // Pass highest role for color
                      }}
                      profile={profile}
                      server={server}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {members.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
              No members found.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
