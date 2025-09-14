"use client";

import { ConversationChannel } from "./server-channel";
import { ServerSection } from "./server-section";
import { useRouter } from "next/navigation";
import { ConversationType } from "@/lib/types";

type ServerChannelListProps = {
  conversations: any[];
  currentProfile: any;
};

export const ServerChannelList = ({ 
  conversations, 
  currentProfile 
}: ServerChannelListProps) => {

  // Helper function to get the other profile in a direct message
  const getDirectMessagePartner = (conversation: any) => {
    const otherMember = conversation.members.find(
      (member: any) => member.profileId !== currentProfile.id
    );
    return otherMember?.profile;
  };

  // Helper function to get conversation display name
  const getConversationName = (conversation: any) => {
    if (conversation.type === ConversationType.GROUP_MESSAGE) {
      return conversation.name || "Group Chat";
    } else {
      const partner = getDirectMessagePartner(conversation);
      return partner?.name || "Unknown User";
    }
  };

  // Helper function to get conversation avatar
  const getConversationAvatar = (conversation: any) => {
    if (conversation.type === ConversationType.GROUP_MESSAGE) {
      // For groups, you could use a default group icon or the creator's avatar
      return null;
    } else {
      const partner = getDirectMessagePartner(conversation);
      return partner?.imageUrl;
    }
  };

  return (
    <div className="space-y-[2px]">
      {conversations.map((conversation) => (
        <ConversationChannel
          key={conversation.id}
          conversation={conversation}
          currentProfile={currentProfile}
          name={getConversationName(conversation)}
          avatar={getConversationAvatar(conversation)}
          type={conversation.type}
          lastMessage={conversation.directMessages[0]}
          memberCount={conversation.members.length}
        />
      ))}
      
      {/* Empty State */}
      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No conversations yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Start a conversation with someone
          </p>
        </div>
      )}
    </div>
  );
};
