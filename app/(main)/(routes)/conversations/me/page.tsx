import { redirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { getOrCreateConversation } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MediaRoom } from "@/components/media-room";
import { PageContextProvider } from "@/components/providers/page-context-provider";
import { NewMessagesBanner } from "@/components/new-messages-banner";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

const PersonalSpacePage = async () => {
  const profile = await currentProfile();

  if (!profile) return redirectToSignIn();

  const currentMember = await db.member.findFirst({
    where: {
      profileId: profile.id,
    },
    include: {
      profile: true,
    },
  });

  if (!currentMember) redirect("/");

  const conversation = await getOrCreateConversation(
    currentMember.id,
    currentMember.id,
  );

  if (!conversation) redirect(`/`);

  const { memberOne, memberTwo } = conversation;

  const otherMember =
    memberOne.profileId === profile.id ? memberTwo : memberOne;

  return (
    <PageContextProvider
      conversationData={{
        id: conversation.id,
        name: "Personal Space",
        type: "conversation",
      }}
      currentProfile={profile}
    >
      <div className="bg-transparent pt-12 flex flex-col h-full">
        <ChatHeader
          imageUrl={otherMember.profile.imageUrl}
          name={otherMember.profile.name}
          type="personal-space"
        />
          <>
            <NewMessagesBanner conversationId={conversation.id} />
            <ChatMessages
              member={currentMember}
              name={otherMember.profile.name}
              chatId={conversation.id}
              type="personal-space"
              apiUrl="/api/direct-messages"
              paramKey="conversationId"
              paramValue={conversation.id}
              socketUrl="/api/socket/direct-messages"
              socketQuery={{
                conversationId: conversation.id,
              }}
            />

            <ChatInput
              name={otherMember.profile.name}
              type="personal-space"
              apiUrl="/api/socket/direct-messages"
              query={{
                conversationId: conversation.id,
              }}
            />
          </>
      </div>
    </PageContextProvider>
  );
};

export default PersonalSpacePage;
