"use client";

import { redirect } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { PageContextProvider } from "@/components/providers/page-context-provider";
import { NewMessagesBanner } from "@/components/new-messages-banner";
import { Id } from "@/convex/_generated/dataModel";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

const PersonalSpacePage = () => {
  const { user } = useAuthStore();
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);

  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const getOrCreatePersonalSpace = useMutation(api.conversations.getOrCreatePersonalSpace);

  const conversation = useQuery(
    api.conversations.getById,
    conversationId && user?.userId
      ? { conversationId, userId: user.userId }
      : "skip"
  );

  // Get or create personal space conversation
  useEffect(() => {
    if (!user?.userId || !profile || conversationId) return;

    const createPersonalSpace = async () => {
      try {
        const conv = await getOrCreatePersonalSpace({ userId: user.userId });
        if (conv) {
          setConversationId(conv._id);
        }
      } catch (error) {
        console.error("Failed to get or create personal space:", error);
      }
    };

    createPersonalSpace();
  }, [user?.userId, profile, getOrCreatePersonalSpace, conversationId]);

  if (profile === undefined || (conversationId && conversation === undefined)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    redirect("/sign-in");
    return null;
  }

  if (!conversationId || !conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
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
        name: "Personal Space",
        type: "conversation",
      }}
      currentProfile={profile}
    >
      <div className="bg-transparent pt-12 flex flex-col h-full">
        <ChatHeader
          imageUrl={profile.imageUrl}
          name={profile.globalName || profile.name}
          type="personal-space"
        />
        <NewMessagesBanner conversationId={conversation._id} />
        <ChatMessages
          member={currentMember}
          name={profile.globalName || profile.name}
          chatId={conversation._id}
          type="personal-space"
          apiUrl="/api/direct-messages"
          paramKey="conversationId"
          paramValue={conversation._id}
          socketUrl="/api/socket/direct-messages"
          socketQuery={{
            conversationId: conversation._id,
          }}
        />

        <ChatInput
          name={profile.globalName || profile.name}
          type="personal-space"
          apiUrl="/api/socket/direct-messages"
          query={{
            conversationId: conversation._id,
          }}
        />
      </div>
    </PageContextProvider>
  );
};

export default PersonalSpacePage;
