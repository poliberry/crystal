"use client";

import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";
import { redirect } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { ServerChannelList } from "./server-channel-list";
import { ServerHeader } from "./server-header";
import { ServerSearch } from "./server-search";
import { UserCard } from "../navigation/user-card";
import { Id } from "@/convex/_generated/dataModel";

type ServerSidebarProps = {
  serverId: string;
};

const iconMap = {
  ["TEXT" as string]: <Hash className="mr-2 h-4 w-4" />,
  ["AUDIO" as string]: <Mic className="mr-2 h-4 w-4" />,
  ["VIDEO" as string]: <Video className="mr-2 h-4 w-4" />,
};

const roleIconMap = {
  ["GUEST" as string]: null,
  ["MODERATOR" as string]: (
    <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />
  ),
  ["ADMIN" as string]: <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />,
};

export const ServerSidebar = ({ serverId }: ServerSidebarProps) => {
  const { user } = useAuthStore();
  
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const server = useQuery(
    api.servers.getById,
    serverId ? { serverId: serverId as Id<"servers"> } : "skip"
  );

  if (profile === undefined || server === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    redirect("/sign-in");
    return null;
  }

  if (!server) {
    redirect("/");
    return null;
  }

  const role = server.members?.find(
    (member: any) => member.profileId === profile?._id
  )?.role;

  // Transform categories and channels for ServerChannelList
  const categories = (server.categories || []).map((category: any) => ({
    id: category._id,
    name: category.name,
    channels: (server.channels || [])
      .filter((channel: any) => channel.categoryId === category._id)
      .sort((a: any, b: any) => a.position - b.position)
      .map((channel: any) => ({
        id: channel._id,
        _id: channel._id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
      })),
  }));

  // Add uncategorized channels
  const uncategorizedChannels = (server.channels || [])
    .filter((channel: any) => !channel.categoryId)
    .sort((a: any, b: any) => a.position - b.position)
    .map((channel: any) => ({
      id: channel._id,
      _id: channel._id,
      name: channel.name,
      type: channel.type,
      position: channel.position,
    }));

  if (uncategorizedChannels.length > 0) {
    categories.push({
      id: "uncategorized",
      name: "Channels",
      channels: uncategorizedChannels,
    });
  }

  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent pb-2 px-4">
      <ServerHeader server={server} role={role} />
      <ScrollArea className="flex-1 px-3">
        <div className="mt-2">
          <ServerSearch
            data={[
              {
                label: "Text Channels",
                type: "channel",
                data: server.channels
                  ?.filter((channel: any) => channel.type === "TEXT")
                  .map((channel: any) => ({
                    id: channel._id,
                    name: channel.name,
                    icon: iconMap["TEXT" as string],
                  })),
              },
              {
                label: "Voice Channels",
                type: "channel",
                data: server.channels
                  ?.filter((channel: any) => channel.type === "AUDIO")
                  .map((channel: any) => ({
                    id: channel._id,
                    name: channel.name,
                    icon: iconMap["AUDIO" as string],
                  })),
              },
              {
                label: "Video Channels",
                type: "channel",
                data: server.channels
                  ?.filter((channel: any) => channel.type === "VIDEO")
                  .map((channel: any) => ({
                    id: channel._id,
                    name: channel.name,
                    icon: iconMap["VIDEO" as string],
                  })),
              },
              {
                label: "Members",
                type: "member",
                data: server.members?.map((member: any) => ({
                  id: member._id,
                  name: member.profile?.name || "Unknown",
                  icon: roleIconMap[member.role],
                })),
              },
            ]}
          />
        </div>
        <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
        <ServerChannelList
          categories={categories}
          server={server}
          role={role}
        />
      </ScrollArea>
    </div>
  );
};
