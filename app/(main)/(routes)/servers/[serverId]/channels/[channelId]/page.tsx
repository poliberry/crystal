"use client";

import { redirect } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { use } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { MediaRoom } from "@/components/media-room";
import { PageContextProvider } from "@/components/providers/page-context-provider";
import { NewMessagesBanner } from "@/components/new-messages-banner";

type ChannelIdPageProps = {
  params: Promise<{
    serverId: string;
    channelId: string;
  }>;
};

const ChannelIdPage = ({ params }: ChannelIdPageProps) => {
  const { user } = useAuthStore();
  const resolvedParams = use(params);

  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const server = useQuery(
    api.servers.getById,
    resolvedParams.serverId ? { serverId: resolvedParams.serverId as Id<"servers"> } : "skip"
  );

  const channel = server?.channels?.find(
    (ch: any) => ch._id === resolvedParams.channelId
  );

  const member = server?.members?.find(
    (m: any) => m.profileId === profile?._id
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

  if (!channel || !member || !server) {
    redirect("/");
    return null;
  }

  return (
    <PageContextProvider
      serverData={{
        id: server._id,
        name: server.name,
        imageUrl: server.imageUrl,
      }}
      channelData={{
        id: channel._id,
        name: channel.name,
        type: channel.type,
      }}
      currentProfile={profile}
    >
      <div className="bg-transparent flex flex-col h-full w-full min-w-0 max-w-full overflow-hidden">
        {channel.type === "TEXT" && (
          <ChatHeader
            name={channel.name}
            serverId={server._id}
            type="channel"
          />
        )}
        {channel.type === "TEXT" && (
          <>
            <NewMessagesBanner channelId={channel._id} />
            <ChatMessages
              name={channel.name}
              chatId={channel._id}
              member={member}
              type="channel"
              apiUrl="/api/messages"
              socketUrl="/api/socket/messages"
              socketQuery={{
                channelId: channel._id,
                serverId: server._id,
              }}
              paramKey="channelId"
              paramValue={channel._id}
            />
            <div className="flex-shrink-0">
              <ChatInput
                name={channel.name}
                type="channel"
                apiUrl="/api/socket/messages"
                query={{
                  channelId: channel._id,
                  serverId: server._id,
                }}
              />
            </div>
          </>
        )}

        {channel.type === "AUDIO" && (
          <>
            <MediaRoom channel={channel} server={server} />
          </>
        )}
      </div>
    </PageContextProvider>
  );
};

export default ChannelIdPage;
