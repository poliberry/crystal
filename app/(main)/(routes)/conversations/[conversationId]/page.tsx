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

  if (!profile) return redirectToSignIn();

  // Find the current member (we need to get their member record)
  const currentMember = await db.member.findFirst({
    where: {
      profileId: profile.id,
    },
    include: {
      profile: true,
    },
  });

  if (!currentMember) redirect("/");

  // Get the conversation and verify the user is a member
  const conversation = await db.conversation.findFirst({
    where: {
      id: params.conversationId,
      members: {
        some: {
          memberId: currentMember.id,
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

  // Determine conversation display info
  let conversationName: string;
  let conversationImageUrl: string;
  let otherMember = null;

  if (conversation.type === ConversationType.DIRECT_MESSAGE) {
    // For direct messages, find the other member
    const otherConversationMember = conversation.members.find(
      (member) => member.memberId !== currentMember.id
    );
    
    if (!otherConversationMember) redirect("/");
    
    otherMember = otherConversationMember.member;
    conversationName = otherMember.profile.name;
    conversationImageUrl = otherMember.profile.imageUrl;
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
            currentMember={currentMember}
            currentProfile={profile}
          />
        </div>
      </ConversationLayoutWrapper>
    </PageContextProvider>
  );
};

export default ConversationPage;
