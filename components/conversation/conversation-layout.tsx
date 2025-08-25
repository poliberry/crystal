"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Profile, ConversationType, Conversation } from "@prisma/client";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { CompactCallUI } from "@/components/compact-call-ui";
import { ExpandedCallUI } from "@/components/expanded-call-ui";
import { CallJoinUI } from "@/components/call-join-ui";
import { ConversationRightSidebar } from "@/components/conversation/conversation-right-sidebar";

interface ConversationLayoutProps {
  conversation: Conversation & {
    members: Array<{
      id: string;
      conversationId: string;
      profileId: string;
      profile: Profile;
      memberId?: string | null;
      member?: {
        id: string;
        profile: Profile;
      } | null;
      joinedAt: Date;
      leftAt: Date | null;
      lastReadAt: Date | null;
    }>;
  };
  conversationName: string;
  conversationImageUrl: string;
  otherMember: Profile | null;
  currentConversationMember: any;
  currentProfile: Profile;
}

export function ConversationLayout({
  conversation,
  conversationName,
  conversationImageUrl,
  otherMember,
  currentConversationMember,
  currentProfile,
}: ConversationLayoutProps) {
  const searchParams = useSearchParams();
  const [activeParticipants, setActiveParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is in a call
  const isInCall = searchParams?.get('audio') === 'true' || searchParams?.get('video') === 'true';
  const isExpanded = searchParams?.get('expanded') === 'true';
  const hasActiveCall = activeParticipants.length > 0;

  // Check for active participants in the room
  useEffect(() => {
    const checkActiveCall = async () => {
      try {
        const response = await fetch(`/api/rooms?room=conversation-${conversation.id}`);
        if (response.ok) {
          const participants = await response.json();
          setActiveParticipants(Array.isArray(participants) ? participants : []);
        } else {
          setActiveParticipants([]);
        }
      } catch (error) {
        console.log("Error checking active call:", error);
        setActiveParticipants([]);
      } finally {
        setIsLoading(false);
      }
    };

    checkActiveCall();
    
    // Poll for active call status every 5 seconds
    const interval = setInterval(checkActiveCall, 5000);
    
    return () => clearInterval(interval);
  }, [conversation.id]);

  // If user is actively in a call and wants expanded view, render the expanded call UI
  if (isInCall && isExpanded) {
    return (
      <ExpandedCallUI
        conversationId={conversation.id}
        conversationName={conversationName}
        conversationType={conversation.type}
        otherMember={otherMember}
      />
    );
  }

  // If user is actively in a call (but not expanded), show chat with compact call UI
  if (isInCall) {
    return (
      <div className="flex h-full">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          <ChatHeader
            imageUrl={conversationImageUrl}
            name={conversationName}
            caller={{
              id: currentProfile.id,
              name: currentProfile.globalName || currentProfile.name,
              avatar: currentProfile.imageUrl,
            }}
            user={otherMember?.id}
            type="conversation"
            conversation={conversation}
            currentProfile={currentProfile}
          />

          <CompactCallUI
            conversationId={conversation.id}
            conversationName={conversationName}
            conversationType={conversation.type}
            otherMember={otherMember}
          />

          <ChatMessages
            member={currentConversationMember}
            name={conversationName}
            chatId={conversation.id}
            type="conversation"
            apiUrl="/api/direct-messages"
            paramKey="conversationId"
            paramValue={conversation.id}
            socketUrl="/api/socket/direct-messages"
            socketQuery={{
              conversationId: conversation.id,
            }}
          />

          <ChatInput
            name={conversationName}
            type="conversation"
            apiUrl="/api/socket/direct-messages"
            query={{
              conversationId: conversation.id,
            }}
            member={currentConversationMember}
          />
        </div>

        {/* Right sidebar - only show when not in call */}
        <aside className="md:flex h-full w-72 flex-col right-0 z-[10]">
          <ConversationRightSidebar />
        </aside>
      </div>
    );
  }

  // Otherwise render the chat interface
  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <ChatHeader
          imageUrl={conversationImageUrl}
          name={conversationName}
          caller={{
            id: currentProfile.id,
            name: currentProfile.globalName || currentProfile.name,
            avatar: currentProfile.imageUrl,
          }}
          user={otherMember?.id}
          type="conversation"
          conversation={conversation}
          currentProfile={currentProfile}
        />

        {/* Show call UI based on state */}
        {hasActiveCall && !isInCall && !isLoading && (
          <CallJoinUI
            conversationId={conversation.id}
            conversationName={conversationName}
            conversationType={conversation.type}
            otherMember={otherMember}
            participantCount={activeParticipants.length}
          />
        )}

        {isInCall && (
          <CompactCallUI
            conversationId={conversation.id}
            conversationName={conversationName}
            conversationType={conversation.type}
            otherMember={otherMember}
          />
        )}

        <ChatMessages
          member={currentConversationMember}
          name={conversationName}
          chatId={conversation.id}
          type="conversation"
          apiUrl="/api/direct-messages"
          paramKey="conversationId"
          paramValue={conversation.id}
          socketUrl="/api/socket/direct-messages"
          socketQuery={{
            conversationId: conversation.id,
          }}
        />

        <ChatInput
          name={conversationName}
          type="conversation"
          apiUrl="/api/socket/direct-messages"
          query={{
            conversationId: conversation.id,
          }}
          member={currentConversationMember}
        />
      </div>

      {/* Right sidebar - only show when not in call */}
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10]">
        <ConversationRightSidebar />
      </aside>
    </div>
  );
}
