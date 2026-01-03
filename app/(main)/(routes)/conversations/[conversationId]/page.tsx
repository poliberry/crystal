"use client";

import { redirect } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { use } from "react";

import { CallDetector } from "@/components/conversation/call-detector";
import { ConversationLayout } from "@/components/conversation/conversation-layout";
import { ConversationLayoutWrapper } from "@/components/layout/conversation-layout-wrapper";
import { PageContextProvider } from "@/components/providers/page-context-provider";

type ConversationPageProps = {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams: Promise<{
    audio?: boolean;
    video?: boolean;
    expanded?: boolean;
  }>;
};

const ConversationPage = ({ params, searchParams }: ConversationPageProps) => {
  const { user } = useAuthStore();
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);

  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  // Validate conversationId is a valid ID (not undefined or empty string)
  const isValidConversationId = 
    resolvedParams.conversationId && 
    resolvedParams.conversationId !== "undefined" && 
    resolvedParams.conversationId !== "" &&
    typeof resolvedParams.conversationId === "string";

  const conversation = useQuery(
    api.conversations.getById,
    isValidConversationId && user?.userId
      ? { conversationId: resolvedParams.conversationId as any, userId: user.userId }
      : "skip"
  );

  if (profile === undefined || conversation === undefined) {
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

  if (!conversation) {
    redirect("/");
    return null;
  }

  // Determine conversation display info
  let conversationName: string;
  let conversationImageUrl: string;
  let otherMember = null;

  if (conversation.type === "DIRECT_MESSAGE") {
    // For direct messages, find the other member
    const otherConversationMember = conversation.members.find(
      (member: any) => member.profileId !== profile._id
    );
    
    if (!otherConversationMember) {
      redirect("/");
      return null;
    }
    
    otherMember = otherConversationMember.member || otherConversationMember;
    conversationName = otherMember.profile?.name || otherMember.profile?.globalName || "Unknown";
    conversationImageUrl = otherMember.profile?.imageUrl || "";
  } else {
    // For group messages
    conversationName = conversation.name || "Group Chat";
    conversationImageUrl = "";
  }

  const currentMember = conversation.members.find(
    (m: any) => m.profileId === profile._id
  );

  if (!currentMember) {
    redirect("/");
    return null;
  }

  return (
    <PageContextProvider
      conversationData={{
        id: conversation._id,
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
          <CallDetector conversationId={resolvedParams.conversationId} />
          
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
