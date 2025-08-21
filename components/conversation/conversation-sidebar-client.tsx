"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerChannelList } from "./server-channel-list";
import { ConversationHeader } from "./conversation-header";
import { ActionTooltip } from "../action-tooltip";
import { Button } from "../ui/button";
import { MessageCircle, Users } from "lucide-react";
import { useModal } from "@/hooks/use-modal-store";

interface ConversationSidebarClientProps {
  initialConversations: any[];
  currentProfile: any;
}

export const ConversationSidebarClient = ({
  initialConversations,
  currentProfile,
}: ConversationSidebarClientProps) => {
  const { socket } = useSocket();
  const { onOpen } = useModal();
  const [conversations, setConversations] = useState(initialConversations);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/conversations/list");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error refreshing conversations:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleConversationsRefresh = () => {
      console.log("Received conversations refresh event");
      fetchConversations();
    };

    socket.on("conversations:refresh", handleConversationsRefresh);

    return () => {
      socket.off("conversations:refresh", handleConversationsRefresh);
    };
  }, [socket]);

  return (
    <div className="flex flex-col h-full text-primary w-full bg-transparent border-r border-l border-muted">
      <ConversationHeader currentProfile={currentProfile} />
      <ScrollArea className="flex-1 px-3 dark:bg-black bg-white">
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-muted-foreground">DIRECT MESSAGES</h4>
            <div className="flex items-center gap-x-1">
              <ActionTooltip label="Create Group">
                <Button
                  onClick={() => onOpen("createGroup", { currentProfile })}
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <Users className="w-4 h-4" />
                </Button>
              </ActionTooltip>
              <ActionTooltip label="Start DM">
                <Button
                  onClick={() =>
                    onOpen("createDirectMessage", { currentProfile })
                  }
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </ActionTooltip>
            </div>
          </div>
          <div className="mb-2">
            <ServerChannelList
              conversations={conversations}
              currentProfile={currentProfile}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
