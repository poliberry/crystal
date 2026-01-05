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

  // Helper function to get first role (by roleIds array order) for a member
  const getHighestRole = (member: any) => {
    const roleIds = member.roleIds || (member.roleId ? [member.roleId] : []);
    if (roleIds.length === 0) {
      // Fallback to legacy role
      const roleOrder: Record<string, number> = { ADMIN: 3, MODERATOR: 2, GUEST: 1 };
      return { position: roleOrder[member.role] || 0, role: member.role, isLegacy: true };
    }
    // Get the first role ID from the array and find its role
    const firstRoleId = roleIds[0];
    return roles.find((r: any) => r._id === firstRoleId) || null;
  };

  // Helper function to get first hoisted role for a member (first in roleIds array order)
  const getHoistedRole = (member: any) => {
    // Get roleIds in the order they appear (this represents assignment order)
    const roleIds = member.roleIds || (member.roleId ? [member.roleId] : []);
    
    // Find the first hoisted role in the order they appear in roleIds
    for (const roleId of roleIds) {
      const role = roles.find((r: any) => r._id === roleId);
      if (role && role.hoist) {
        return role;
      }
    }
    
    // Fallback: if roleIds order doesn't work, check member.roles array
    const memberRoles = getMemberRoles(member);
    const hoistedRoles = memberRoles.filter((r: any) => r.hoist);
    
    if (hoistedRoles.length === 0) {
      return null;
    }
    
    // Return the first hoisted role found (maintain original order)
    return hoistedRoles[0] || null;
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
      const hoistedRole = getHoistedRole(member); // First hoisted role for grouping and color
      const highestRole = getHighestRole(member);
      // Get first role in roleIds array for color (for non-hoisted online members)
      const firstRole = (() => {
        const roleIds = member.roleIds || (member.roleId ? [member.roleId] : []);
        if (roleIds.length === 0) return null;
        const firstRoleId = roleIds[0];
        return roles.find((r: any) => r._id === firstRoleId) || null;
      })();
      const isOnline = isMemberOnline(member);

        // Offline and invisible members always go to Offline section
        if (!isOnline) {
          // For offline members, use highest role for color (hoisted or non-hoisted)
          offlineMembers.push({ ...member, highestRole, hoistedRole, colorRole: highestRole });
          return;
        }

        // Online members are grouped by hoisted roles
        if (hoistedRole) {
          // Member has a hoisted role - group by first hoisted role (for grouping)
          const roleKey = hoistedRole._id;
          if (!groups[roleKey]) {
            groups[roleKey] = {
              role: hoistedRole,
              members: [],
              onlineCount: 0,
            };
          }
          groups[roleKey].members.push({ ...member, highestRole, hoistedRole, colorRole: hoistedRole });
          groups[roleKey].onlineCount++;
        } else {
          // Member has no hoisted role - group in Online section
          // Use first role in roleIds array for color
          onlineMembers.push({ ...member, highestRole, colorRole: firstRole || highestRole });
        }
      });

    // Sort members within each group alphabetically by name
    Object.values(groups).forEach((group) => {
      group.members.sort((a: any, b: any) => {
        const nameA = (a.profile?.globalName || a.profile?.name || "").toLowerCase();
        const nameB = (b.profile?.globalName || b.profile?.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });

    // Sort online members alphabetically by name
    onlineMembers.sort((a: any, b: any) => {
      const nameA = (a.profile?.globalName || a.profile?.name || "").toLowerCase();
      const nameB = (b.profile?.globalName || b.profile?.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Sort offline members alphabetically by name
    offlineMembers.sort((a: any, b: any) => {
      const nameA = (a.profile?.globalName || a.profile?.name || "").toLowerCase();
      const nameB = (b.profile?.globalName || b.profile?.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
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
                        roleData: member.hoistedRole || member.highestRole, // Use first hoisted role for color, fallback to highest role
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
                  // For non-hoisted online members, use first role in roleIds array for color
                  return (
                    <ServerMember
                      key={memberId}
                      member={{
                        ...member,
                        roleData: member.colorRole || member.highestRole, // Use first role for color, fallback to highest role
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
                  // For offline members, use highest role (by position) for color (hoisted or non-hoisted)
                  return (
                    <ServerMember
                      key={memberId}
                      member={{
                        ...member,
                        roleData: member.colorRole || member.highestRole, // Use highest role for color
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
