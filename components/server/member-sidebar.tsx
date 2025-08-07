"use client";

import { ChannelType, MemberRole } from "@prisma/client";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";

import { ServerChannel } from "./server-channel";
import { ServerHeader } from "./server-header";
import { ServerMember } from "./server-member";
import { ServerSearch } from "./server-search";
import { ServerSection } from "./server-section";
import { useSocket } from "../providers/socket-provider";

type ServerSidebarProps = {
  serverId: string;
  initialData: any; // Pass initial server data as prop
  currentProfile: any; // Pass current profile as prop
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

export const MemberSidebar = ({ serverId, initialData, currentProfile }: ServerSidebarProps) => {
  const { socket } = useSocket();
  const [server, setServer] = useState(initialData);
  const profile = currentProfile;

  useEffect(() => {
    if (!socket) return;

    // Listen for profile updates
    const memberUpdateKey = `members:poll`;

    const handleMemberUpdate = async () => {
      const data = await fetch(`/api/servers/${serverId}/members`);
      const updatedServer = await data.json();
      setServer(updatedServer);
    };

    socket.on(memberUpdateKey, handleMemberUpdate);

    return () => {
      socket.off(memberUpdateKey, handleMemberUpdate);
    };
  }, [socket, serverId]);

  const members = server?.members;
  const role = server.members.find(
    (member: any) => member.profileId === profile.id,
  )?.role;

  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent border-l border-muted">
      <div className="px-3 mt-2 border-b border-muted pb-2">
        <ServerSection
          sectionType="members"
          server={server}
          role={role}
          label="Members"
        />
      </div>
      <ScrollArea className="flex-1 px-3 shadow-md dark:bg-black bg-white rounded-xl">
        <div className="mt-2">
          {!!members?.length && (
            <div className="mb-2">
              <div className="space-y-[2px]">
                {members.map((member: any) => (
                  <ServerMember
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
