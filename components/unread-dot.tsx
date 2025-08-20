"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { useSocket } from "@/components/providers/socket-provider";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UnreadDotProps {
  channelId?: string;
  conversationId?: string;
}

export const UnreadDot = ({ channelId, conversationId }: UnreadDotProps) => {
  const { getUnreadByChannel, getUnreadByConversation, refreshNotifications } = useNotifications();
  const { socket } = useSocket();
  
  const hasUnread = channelId 
    ? getUnreadByChannel(channelId) > 0 
    : conversationId 
    ? getUnreadByConversation(conversationId) > 0 
    : false;

  // Listen for scroll-to-bottom events from the socket API routes
  useEffect(() => {
    if (!socket) return;

    const handleChannelScrollToBottom = (data: { channelId: string, profileId: string }) => {
      if (channelId && data.channelId === channelId) {
        // Refresh notifications to get updated state
        refreshNotifications();
      }
    };

    const handleConversationScrollToBottom = (data: { conversationId: string, profileId: string }) => {
      if (conversationId && data.conversationId === conversationId) {
        // Refresh notifications to get updated state
        refreshNotifications();
      }
    };

    socket.on("channel:scrolled-to-bottom", handleChannelScrollToBottom);
    socket.on("conversation:scrolled-to-bottom", handleConversationScrollToBottom);

    return () => {
      socket.off("channel:scrolled-to-bottom", handleChannelScrollToBottom);
      socket.off("conversation:scrolled-to-bottom", handleConversationScrollToBottom);
    };
  }, [socket, channelId, conversationId, refreshNotifications]);

  return (
    <AnimatePresence>
      {hasUnread && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.2 }}
          className="w-2 h-2 bg-white rounded-full flex-shrink-0"
        />
      )}
    </AnimatePresence>
  );
};
