import { ChannelType } from "@prisma/client";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video, Radio, Megaphone } from "lucide-react";
import { redirect } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType } from "@/types/permissions";

import { ServerChannelList } from "./server-channel-list";
import { ServerHeader } from "./server-header";
import { ServerSearch } from "./server-search";
import { SignedIn } from "@clerk/nextjs";
import { UserCard } from "../navigation/user-card";

type ServerSidebarProps = {
  serverId: string;
};

const iconMap = {
  [ChannelType.TEXT]: <Hash className="mr-2 h-4 w-4" />,
  [ChannelType.AUDIO]: <Mic className="mr-2 h-4 w-4" />,
  [ChannelType.VIDEO]: <Video className="mr-2 h-4 w-4" />,
  [ChannelType.STAGE]: <Radio className="mr-2 h-4 w-4" />,
  [ChannelType.ANNOUNCEMENT]: <Megaphone className="mr-2 h-4 w-4" />,
};

const getRoleIcon = (member: any) => {
  // Temporarily fallback to old role system while we verify the database
  if (member.role === 'ADMIN') {
    return <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />;
  }
  if (member.role === 'MODERATOR') {
    return <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />;
  }
  
  // TODO: Once database is verified, use this permission-based logic:
  // Check if member has administrator permission
  // if (member.memberRoles?.some((mr: any) => 
  //   mr.role.permissions?.some((p: any) => p.permission === 'ADMINISTRATOR' && p.grant === 'ALLOW')
  // )) {
  //   return <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />;
  // }
  
  // Check if member has moderation permissions
  // if (member.memberRoles?.some((mr: any) => 
  //   mr.role.permissions?.some((p: any) => 
  //     ['KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_MESSAGES'].includes(p.permission) && p.grant === 'ALLOW'
  //   )
  // )) {
  //   return <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />;
  // }
  
  return null;
};

export const ServerSidebar = async ({ serverId }: ServerSidebarProps) => {
  const profile = await currentProfile();

  if (!profile) redirect("/");

  const server = await db.server.findUnique({
    where: {
      id: serverId,
    },
    include: {
      channels: {
        orderBy: {
          position: "asc",
        },
      },
      members: {
        include: {
          profile: true,
          // memberRoles: {
          //   include: {
          //     role: {
          //       include: {
          //         permissions: true
          //       }
          //     }
          //   }
          // }
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      categories: {
        include: {
          channels: {
            orderBy: {
              position: "asc",
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (!server) redirect("/");

  const textChannels = server?.channels.filter(
    (channel) => channel.type === ChannelType.TEXT
  );
  const audioChannels = server?.channels.filter(
    (channel) => channel.type === ChannelType.AUDIO
  );
  const videoChannels = server?.channels.filter(
    (channel) => channel.type === ChannelType.VIDEO
  );
  const members = server?.members.filter(
    (member) => member.profileId !== profile.id
  );

  const currentMember = server.members.find(
    (member) => member.profileId === profile.id
  );
  
  if (!currentMember) redirect("/");

  // Get member permissions
  const canManageChannels = await PermissionManager.hasPermission(
    currentMember.id,
    PermissionType.MANAGE_CHANNELS
  );
  
  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent border-r border-l border-muted">
      <ServerHeader 
        server={server} 
        member={currentMember}
        canManageChannels={canManageChannels.granted}
      />
      <ScrollArea className="flex-1 px-3 backdrop-blur-2xl bg-white/20 dark:bg-black/20 pt-4 -mt-4">
        <div className="mt-2">
          <ServerSearch
            data={[
              {
                label: "Text Channels",
                type: "channel",
                data: textChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                })),
              },
              {
                label: "Voice Channels",
                type: "channel",
                data: audioChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                })),
              },
              {
                label: "Video Channels",
                type: "channel",
                data: videoChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                })),
              },
              {
                label: "Members",
                type: "member",
                data: members?.map((member) => ({
                  id: member.id,
                  name: member.profile.name,
                  icon: getRoleIcon(member),
                })),
              },
            ]}
          />

          <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
          <div className="mb-2">
            <ServerChannelList
              categories={server.categories}
              member={currentMember}
              server={server}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
