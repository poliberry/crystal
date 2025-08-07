"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerChannelList } from "./server-channel-list";
import { ConversationHeader } from "./conversation-header";

interface ConversationSidebarClientProps {
  initialConversations: any[];
  currentMember: any;
  currentProfile: any;
}

export const ConversationSidebarClient = ({
  initialConversations,
  currentMember,
  currentProfile,
}: ConversationSidebarClientProps) => {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState(initialConversations);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/conversations/list');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleConversationsRefresh = () => {
      console.log('Received conversations refresh event');
      fetchConversations();
    };

    socket.on("conversations:refresh", handleConversationsRefresh);

    return () => {
      socket.off("conversations:refresh", handleConversationsRefresh);
    };
  }, [socket]);

  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent border-r border-l border-muted">
      <ConversationHeader currentMember={currentMember} currentProfile={currentProfile} />
      <ScrollArea className="flex-1 px-3 dark:bg-black bg-white">
        <div className="mt-2">
          <div className="mb-2">
            <ServerChannelList
              conversations={conversations}
              currentMember={currentMember}
              currentProfile={currentProfile}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
