"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../providers/socket-provider";
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
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for presence status updates
    socket.on("presence-status-update", (data: { profileId: string; status: UserStatus; presenceStatus?: string }) => {
      setMembers(prevMembers => 
        prevMembers.map(member => {
          if (member.profile.id === data.profileId) {
            const presence = getDiscordPresence(
              data.status,
              data.presenceStatus || member.profile.presenceStatus
            );
            
            return {
              ...member,
              profile: {
                ...member.profile,
                status: data.status,
                presenceStatus: data.presenceStatus || member.profile.presenceStatus,
                displayStatus: presence.customStatus,
                isOnline: presence.isOnline
              }
            };
          }
          return member;
        })
      );
    });

    // Listen for user status changes
    socket.on("user-status-change", (data: { profileId: string; status: UserStatus; prevStatus?: UserStatus }) => {
      setMembers(prevMembers => 
        prevMembers.map(member => {
          if (member.profile.id === data.profileId) {
            const presence = getDiscordPresence(
              data.status,
              member.profile.presenceStatus
            );
            
            return {
              ...member,
              profile: {
                ...member.profile,
                status: data.status,
                prevStatus: data.prevStatus || member.profile.prevStatus,
                displayStatus: presence.customStatus,
                isOnline: presence.isOnline
              }
            };
          }
          return member;
        })
      );
    });

    // Listen for members joining/leaving
    socket.on("member-update", (data: { action: 'join' | 'leave'; member: any; serverId: string }) => {
      if (data.serverId === server.id) {
        if (data.action === 'join') {
          setMembers(prevMembers => {
            if (!prevMembers.find(m => m.id === data.member.id)) {
              return [...prevMembers, data.member];
            }
            return prevMembers;
          });
        } else if (data.action === 'leave') {
          setMembers(prevMembers => prevMembers.filter(m => m.id !== data.member.id));
        }
      }
    });

    return () => {
      socket.off("presence-status-update");
      socket.off("user-status-change");
      socket.off("member-update");
    };
  }, [socket, server.id]);

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
          profile={profile}
          server={server}
        />
      ))}
    </div>
  );
};
