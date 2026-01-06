"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ConversationType, Profile, Conversation } from "@/types/conversation";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { CompactCallUI } from "@/components/compact-call-ui";
import { ExpandedCallUI } from "@/components/expanded-call-ui";
import { CallJoinUI } from "@/components/call-join-ui";
import { ConversationRightSidebar } from "@/components/conversation/conversation-right-sidebar";

interface ConversationLayoutProps {
  conversation: any; // Conversation from Convex
  conversationName: string;
  conversationImageUrl: string;
  otherMember: any;
  currentMember: any;
  currentProfile: any; // Profile from Convex
}

export function ConversationLayout({
  conversation,
  conversationName,
  conversationImageUrl,
  otherMember,
  currentMember,
  currentProfile,
}: ConversationLayoutProps) {
  const searchParams = useSearchParams();
  const conversationId = conversation._id || conversation.id;
  const participants = useQuery(
    api.voiceParticipants.getParticipants,
    conversationId ? { roomName: `conversation-${conversationId}` } : "skip"
  );

  const isLoading = typeof participants === "undefined";
  // Check if user is in a call
  const isInCall = searchParams?.get('audio') === 'true' || searchParams?.get('video') === 'true';
  const isExpanded = searchParams?.get('expanded') === 'true';
  const hasActiveCall = participants && participants.length > 0;

  // If user is actively in a call and wants expanded view, render the expanded call UI
  if (isInCall && isExpanded) {
    return (
      <ExpandedCallUI
        conversationId={conversation._id || conversation.id}
        conversationName={conversationName}
        conversationType={conversation.type}
        otherMember={otherMember?.profile}
      />
    );
  }

  // If user is actively in a call (but not expanded), show chat with compact call UI
  if (isInCall) {
    return (
      <div className="flex h-full">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col pb-2 bg-background">
          <ChatHeader
            imageUrl={conversationImageUrl}
            name={conversationName}
            caller={{
              id: currentProfile._id || currentProfile.id,
              name: currentProfile.globalName || currentProfile.name,
              avatar: currentProfile.imageUrl,
            }}
            user={otherMember?.profile?._id || otherMember?.profile?.id}
            type="conversation"
            conversation={conversation}
            currentProfile={currentProfile}
          />

          <CompactCallUI
            conversationId={conversation._id || conversation.id}
            conversationName={conversationName}
            conversationType={conversation.type}
            otherMember={otherMember?.profile}
          />

          <ChatMessages
            member={currentMember ? {
              id: currentMember._id || currentMember.id || currentMember.profileId,
              _id: currentMember._id || currentMember.id || currentMember.profileId,
              profileId: currentMember.profileId || currentMember._id || currentMember.id,
              role: currentMember.role || "MEMBER",
              profile: currentMember.profile || currentProfile,
            } : currentMember}
            name={conversationName}
            chatId={conversation._id || conversation.id}
            type="conversation"
            apiUrl="/api/direct-messages"
            paramKey="conversationId"
            paramValue={conversation._id || conversation.id}
            socketUrl="/api/socket/direct-messages"
            socketQuery={{
              conversationId: conversation._id || conversation.id,
            }}
          />

          <ChatInput
            name={conversationName}
            type="conversation"
            apiUrl="/api/socket/direct-messages"
            query={{
              conversationId: conversation._id || conversation.id,
            }}
          />
        </div>

        {/* Right sidebar - only show when not in call */}
        <aside className="md:flex h-full w-72 flex-col right-0 z-[10] px-4 pb-2">
          <ConversationRightSidebar />
        </aside>
      </div>
    );
  }

  // Otherwise render the chat interface
  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col mb-2 bg-background">
        <ChatHeader
          imageUrl={conversationImageUrl}
          name={conversationName}
          caller={{
            id: currentProfile._id || currentProfile.id,
            name: currentProfile.globalName || currentProfile.name,
            avatar: currentProfile.imageUrl,
          }}
          user={otherMember?.profile?._id || otherMember?.profile?.id}
          type="conversation"
          conversation={conversation}
          currentProfile={currentProfile}
        />

        {/* Show call UI based on state */}
        {hasActiveCall && !isInCall && !isLoading && (
          <CallJoinUI
            conversationId={conversation._id || conversation.id}
            conversationName={conversationName}
            conversationType={conversation.type}
            otherMember={otherMember}
            participantCount={participants ? participants.length : 0}
          />
        )}

        {isInCall && (
          <CompactCallUI
            conversationId={conversation._id || conversation.id}
            conversationName={conversationName}
            conversationType={conversation.type}
            otherMember={otherMember?.profile}
          />
        )}

        <ChatMessages
          member={currentMember ? {
            id: currentMember._id || currentMember.id || currentMember.profileId,
            _id: currentMember._id || currentMember.id || currentMember.profileId,
            profileId: currentMember.profileId || currentMember._id || currentMember.id,
            role: currentMember.role || "MEMBER",
            profile: currentMember.profile || currentProfile,
          } : currentMember}
          name={conversationName}
          chatId={conversation._id || conversation.id}
          type="conversation"
          apiUrl="/api/direct-messages"
          paramKey="conversationId"
          paramValue={conversation._id || conversation.id}
          socketUrl="/api/socket/direct-messages"
          socketQuery={{
            conversationId: conversation._id || conversation.id,
          }}
        />

        <ChatInput
          name={conversationName}
          type="conversation"
          apiUrl="/api/socket/direct-messages"
          query={{
            conversationId: conversation._id || conversation.id,
          }}
        />
      </div>

      {/* Right sidebar - only show when not in call */}
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] pl-4 mr-4 pb-2">
        <ConversationRightSidebar />
      </aside>
    </div>
  );
}
