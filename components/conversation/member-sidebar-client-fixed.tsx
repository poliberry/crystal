"use client";

import { useEffect, useState } from "react";
import { usePusher } from "../providers/pusher-provider";
import { ServerMember } from "./server-member";
import { getDiscordPresence } from "@/lib/presence-utils";
import { UserStatus } from "@prisma/client";

interface MemberSidebarClientProps {
  members: any[];
  profile: any;
  server: any;
}

export const MemberSidebarClient = ({ members: initialMembers, profile, server }: MemberSidebarClientProps) => {
  const [members, setMembers] = useState(initialMembers);
  const { pusher, isConnected } = usePusher();

  useEffect(() => {
    if (!pusher || !isConnected) return;

    const channel = pusher.subscribe("presence");

    // Listen for presence status updates
    const handleStatusUpdate = (data: { 
      userId: string; 
      profileId: string; 
      status: UserStatus; 
      presenceStatus?: string | null;
      prevStatus?: UserStatus;
    }) => {
      setMembers(prevMembers => 
        prevMembers.map(member => {
          if (member.profile.id === data.profileId || member.profile.userId === data.userId) {
            const presence = getDiscordPresence(
              data.status,
              data.presenceStatus || member.profile.presenceStatus
            );
            
            return {
              ...member,
              profile: {
                ...member.profile,
                status: data.status,
                presenceStatus: data.presenceStatus !== undefined ? data.presenceStatus : member.profile.presenceStatus,
                displayStatus: presence.customStatus,
                isOnline: presence.isOnline
              }
            };
          }
          return member;
        })
      );
    };

    // Listen to multiple event types for comprehensive coverage
    channel.bind("user:status:update", handleStatusUpdate);
    channel.bind("user:presence:update", handleStatusUpdate); 
    channel.bind("presence-status-update", handleStatusUpdate);

    return () => {
      channel.unbind("user:status:update", handleStatusUpdate);
      channel.unbind("user:presence:update", handleStatusUpdate);
      channel.unbind("presence-status-update", handleStatusUpdate);
      pusher.unsubscribe("presence");
    };
  }, [pusher, isConnected, server.id]);

  // Initialize presence status for all members
  useEffect(() => {
    setMembers(prevMembers => 
      prevMembers.map(member => {
        const presence = getDiscordPresence(
          member.profile.status,
          member.profile.presenceStatus
        );
        
        return {
          ...member,
          profile: {
            ...member.profile,
            displayStatus: presence.customStatus,
            isOnline: presence.isOnline
          }
        };
      })
    );
  }, []);

  return (
    <div className="space-y-[2px]">
      {members.map((member) => (
        <ServerMember
          key={member.id}
          member={member}
          server={server}
          profile={profile}
        />
      ))}
    </div>
  );
};
