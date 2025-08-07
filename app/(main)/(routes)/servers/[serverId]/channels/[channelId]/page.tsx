import { redirectToSignIn } from "@clerk/nextjs";
import { ChannelType } from "@prisma/client";
import { redirect } from "next/navigation";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { MediaRoom } from "@/components/media-room";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { FloatingCallCard } from "@/components/call-ui";
import { GlobalDropzone } from "@/components/chat/global-dropzone";
import { Metadata } from "next";
import { metadata } from "@/app/layout";
import Head from "next/head";

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

  return {
    title: `${channel?.type !== ChannelType.AUDIO ? "#" : ""}${channel?.name} | ${server?.name} | Crystal`,
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

  if (!channel || !member) redirect("/");

  return (
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
    </div>
  );
};

export default ChannelIdPage;
