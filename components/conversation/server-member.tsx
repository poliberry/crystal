"use client"

import {
  type Member,
  type Profile,
  type Server,
} from "@prisma/client";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { getDiscordPresence, getStatusColor } from "@/lib/presence-utils";

import { UserAvatar } from "../user-avatar";
import { useEffect, useState } from "react";
import { useSocket } from "../providers/socket-provider";

type ServerMemberProps = {
  member: Member & { profile: Profile };
  server: Server;
  profile: Profile | null;
};

const getRoleIcon = (member: any) => {
  // Check if member has administrator permission
  if (member.memberRoles?.some((mr: any) => 
    mr.role.permissions?.some((p: any) => p.permission === 'ADMINISTRATOR' && p.grant === 'ALLOW')
  )) {
    return <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />;
  }
  
  // Check if member has moderation permissions
  if (member.memberRoles?.some((mr: any) => 
    mr.role.permissions?.some((p: any) => 
      ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MANAGE_ROLES'].includes(p.permission) && p.grant === 'ALLOW'
    )
  )) {
    return <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />;
  }
  
  // Default guest
  return null;
};

export const ServerMember = ({ member, profile, server }: ServerMemberProps) => {
  const { socket } = useSocket();
  const params = useParams();
  const router = useRouter();

  // Get the correct presence status
  const presence = getDiscordPresence(
    member.profile.status,
    member.profile.presenceStatus
  );

  const onClick = () => {
    if (member.profile.name === profile?.name) {
      router.push(`/conversations/me`);
      return;
    } else {
      router.push(`/conversations/${member.id}`);
    }
  };

  const icon = getRoleIcon(member);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
        params?.memberId === member.id && "bg-zinc-700/20 dark:bg-zinc-700",
      )}
    >
      <div className="relative">
        <UserAvatar
          src={member.profile.imageUrl}
          alt={member.profile.name}
          className={cn(
            "h-8 w-8 md:h-8 md:w-8 transition",
            !presence.isOnline && "opacity-40"
          )}
        />
        <span
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
            getStatusColor(presence.status)
          )}
          title={presence.displayText}
        />
      </div>
      <div className="flex flex-col items-start">
        <p
          className={cn(
            "font-semibold text-sm group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition",
            !presence.isOnline
              ? "text-zinc-400 opacity-70"
              : "text-zinc-500 dark:text-zinc-400",
            params?.memberId === member.id &&
              (presence.isOnline
                ? "text-primary dark:text-zinc-200 dark:group-hover:text-white"
                : "")
          )}
        >
          {member.profile.name}
        </p>
        <p className="text-xs text-zinc-400">
          {presence.customStatus}
        </p>
      </div>
      {icon}
    </button>
  );
};
