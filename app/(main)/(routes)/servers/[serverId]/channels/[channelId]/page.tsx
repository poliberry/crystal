import { redirectToSignIn } from "@clerk/nextjs";
import { ChannelType } from "@prisma/client";
import { redirect } from "next/navigation";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { MediaRoom } from "@/components/media-room";
import { StageRoom } from "@/components/stage-room";
import { AnnouncementChannel } from "@/components/announcement-channel";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { FloatingCallCard } from "@/components/call-ui";
import { GlobalDropzone } from "@/components/chat/global-dropzone";
import { Metadata } from "next";
import { metadata } from "@/app/layout";
import Head from "next/head";
import { PageContextProvider } from "@/components/providers/page-context-provider";
import { NewMessagesBanner } from "@/components/new-messages-banner";

type ChannelIdPageProps = {
  params: {
    serverId: string;
    channelId: string;
  };
};

export async function generateMetadata({
  params,
}: ChannelIdPageProps): Promise<Metadata> {
  const profile = await currentProfile();

  if (!profile) return redirectToSignIn();

  const server = await db.server.findUnique({
    where: {
      id: params.serverId,
    },
  });

  const channel = await db.channel.findUnique({
    where: {
      id: params.channelId,
    },
  });

  const channelPrefix = channel?.type !== ChannelType.AUDIO && (channel?.type as any) !== "STAGE" ? "#" : "";

  return {
    title: `${channelPrefix}${channel?.name} | ${server?.name} | Crystal`,
    description: `Chat in ${channel?.name} on ${server?.name}`,
  };
}

const ChannelIdPage = async ({ params }: ChannelIdPageProps) => {
  const profile = await currentProfile();

  if (!profile) return redirectToSignIn();

  const server = await db.server.findUnique({
    where: {
      id: params.serverId,
    },
  });

  const channel = await db.channel.findUnique({
    where: {
      id: params.channelId,
    },
  });

  const member = await db.member.findFirst({
    where: {
      serverId: params.serverId,
      profileId: profile.id,
    },
  });

  if (!channel || !member || !server) redirect("/");

  return (
    <PageContextProvider
      serverData={{
        id: server.id,
        name: server.name,
        imageUrl: server.imageUrl,
      }}
      channelData={{
        id: channel.id,
        name: channel.name,
        type: channel.type,
      }}
      currentProfile={profile}
    >
      <div className="bg-transparent flex flex-col h-full">
        {channel.type === ChannelType.TEXT && (
          <ChatHeader
            name={channel.name}
            serverId={channel.serverId}
            type="channel"
          />
        )}
        {channel.type === ChannelType.TEXT && (
          <>
            <NewMessagesBanner channelId={channel.id} />
            <ChatMessages
              name={channel.name}
              chatId={channel.id}
              member={member}
              type="channel"
              apiUrl="/api/messages"
              socketUrl="/api/socket/messages"
              socketQuery={{
                channelId: channel.id,
                serverId: channel.serverId,
              }}
              paramKey="channelId"
              paramValue={channel.id}
            />
            <ChatInput
              name={channel.name}
              type="channel"
              apiUrl="/api/socket/messages"
              query={{
                channelId: channel.id,
                serverId: channel.serverId,
              }}
            />
          </>
        )}

        {channel.type === ChannelType.AUDIO && (
          <>
            <MediaRoom channel={channel} server={server} />
          </>
        )}

        {(channel.type as any) === "STAGE" && (
          <>
            <StageRoom
              channel={channel}
              server={server}
              member={member}
              chatId={channel.id}
              apiUrl="/api/messages"
              socketUrl="/api/socket/messages"
              socketQuery={{
                channelId: channel.id,
                serverId: channel.serverId,
              }}
              paramKey="channelId"
              paramValue={channel.id}
            />
          </>
        )}

        {(channel.type as any) === "ANNOUNCEMENT" && (
          <AnnouncementChannel
            channel={channel}
            member={member}
            chatId={channel.id}
            apiUrl="/api/messages"
            socketUrl="/api/socket/messages"
            socketQuery={{
              channelId: channel.id,
              serverId: channel.serverId,
            }}
            paramKey="channelId"
            paramValue={channel.id}
          />
        )}
      </div>
    </PageContextProvider>
  );
};

export default ChannelIdPage;
