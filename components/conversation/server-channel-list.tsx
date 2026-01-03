"use client";

import { ConversationType } from "@/types/conversation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ConversationChannel } from "./server-channel";
import { ServerSection } from "./server-section";
import { useRouter } from "next/navigation";

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
    if (!conversation.members) return null;
    const otherMember = conversation.members.find(
      (member: any) => member.profileId !== currentProfile._id && member.profileId !== currentProfile.id
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
      {conversations.map((conversation) => {
        // Safely get last message - check for lastMessage from Convex or directMessages array
        const lastMessage = conversation.lastMessage || 
          (conversation.directMessages && conversation.directMessages.length > 0 
            ? conversation.directMessages[0] 
            : null);

        return (
          <ConversationChannel
            key={conversation._id || conversation.id}
            conversation={conversation}
            currentProfile={currentProfile}
            name={getConversationName(conversation)}
            avatar={getConversationAvatar(conversation)}
            type={conversation.type}
            lastMessage={lastMessage}
            memberCount={conversation.members?.length || 0}
          />
        );
      })}
      
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
