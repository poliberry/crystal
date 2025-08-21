import { redirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { CallDetector } from "@/components/conversation/call-detector";
import { ConversationLayout } from "@/components/conversation/conversation-layout";
import { ConversationLayoutWrapper } from "@/components/layout/conversation-layout-wrapper";
import { ConversationType } from "@prisma/client";
import { PageContextProvider } from "@/components/providers/page-context-provider";

type ConversationPageProps = {
  params: {
    conversationId: string;
  };
  searchParams: {
    audio?: boolean;
    video?: boolean;
    expanded?: boolean;
  };
};

const ConversationPage = async ({ params, searchParams }: ConversationPageProps) => {
  const profile = await currentProfile();
  const { conversationId } = await params;

  if (!profile) return redirectToSignIn();

  // Get the conversation and verify the user is a member
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      members: {
        some: {
          profileId: profile.id,
          leftAt: null, // Only active members
        },
      },
    },
    include: {
      members: {
        where: {
          leftAt: null,
        },
        include: {
          profile: true,
          member: {
            include: {
              profile: true,
            },
          },
        },
      },
      creator: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!conversation) redirect("/");

  // Find the current user's conversation member record
  const currentConversationMember = conversation.members.find(
    (member) => member.profileId === profile.id
  );

  if (!currentConversationMember) redirect("/");

  // Determine conversation display info
  let conversationName: string;
  let conversationImageUrl: string;
  let otherMember = null;

  if (conversation.type === ConversationType.DIRECT_MESSAGE) {
    // For direct messages, find the other member
    const otherConversationMember = conversation.members.find(
      (member) => member.profileId !== profile.id
    );
    
    if (!otherConversationMember) redirect("/");
    
    otherMember = otherConversationMember.profile;
    conversationName = otherMember?.name as string;
    conversationImageUrl = otherMember?.imageUrl as string;
  } else {
    // For group messages
    conversationName = conversation.name || "Group Chat";
    conversationImageUrl = ""; // You can set a default group image here
  }

  // Check if user is in a call
  const isInCall = searchParams.audio || searchParams.video;
  const isExpanded = searchParams.expanded;

  return (
    <PageContextProvider
      conversationData={{
        id: conversation.id,
        name: conversationName,
        type: "conversation",
      }}
      currentProfile={profile}
    >
      <ConversationLayoutWrapper
        currentProfile={profile}
        currentConversation={conversation}
      >
        <div className="bg-transparent flex flex-col h-full">
          <CallDetector conversationId={params.conversationId} />
          
          <ConversationLayout
            conversation={conversation}
            conversationName={conversationName}
            conversationImageUrl={conversationImageUrl}
            otherMember={otherMember}
            currentConversationMember={currentConversationMember}
            currentProfile={profile}
          />
        </div>
      </ConversationLayoutWrapper>
    </PageContextProvider>
  );
};

export default ConversationPage;
