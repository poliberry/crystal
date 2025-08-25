"use client";

import { MemberRole, type Member, type Profile, type Server } from "@prisma/client";
import { ShieldAlert, ShieldCheck, Crown, Hash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSocket } from "../providers/socket-provider";

import { cn } from "@/lib/utils";
import { UserAvatar } from "../user-avatar";
import { UserDialog } from "../user-dialog";
import { Badge } from "../ui/badge";

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
  const { socket } = useSocket();
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<string>("offline");

  useEffect(() => {
    if (!socket) return;

    const userStatusKey = `user:${member.profile.userId}:status`;
    
    socket.on(userStatusKey, (status: string) => {
      setOnlineStatus(status);
    });

    return () => {
      socket.off(userStatusKey);
    };
  }, [socket, member.profile.userId]);

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

  // Get status indicator color
  const getStatusColor = () => {
    switch (onlineStatus) {
      case "online":
        return "bg-green-500";
      case "idle":
        return "bg-yellow-500";
      case "dnd":
        return "bg-red-500";
      case "invisible":
      case "offline":
      default:
        return "bg-gray-400";
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          "group flex items-center gap-x-2 w-full p-2 transition mb-1 rounded-md hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50",
          "relative"
        )}
      >
        <div className="relative">
          <UserAvatar 
            src={member.profile.imageUrl} 
            className="h-8 w-8 md:h-8 md:w-8"
          />
          {/* Online status indicator */}
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800",
            getStatusColor()
          )} />
        </div>
        
        <div className="flex flex-col items-start min-w-0 flex-1">
          <div className="flex items-center gap-2 w-full">
            <p 
              className={cn(
                "font-semibold text-sm truncate",
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
          
          {/* Role badges */}
          {member.roles && member.roles.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {member.roles
                .sort((a, b) => b.position - a.position)
                .slice(0, 2) // Show max 2 roles to prevent overflow
                .map((role) => (
                  <Badge
                    key={role.id}
                    variant="secondary"
                    className="text-xs px-1 py-0 h-4"
                    style={{
                      backgroundColor: `${role.color}20`,
                      color: role.color,
                      borderColor: `${role.color}40`
                    }}
                  >
                    {role.name}
                  </Badge>
                ))}
              {member.roles.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                  +{member.roles.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </button>

      <UserDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        member={member}
        currentProfile={profile}
        server={server}
      />
    </>
  );
};
