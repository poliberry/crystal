"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { motion, AnimatePresence } from "framer-motion";

interface UnreadDotProps {
  channelId?: string;
  conversationId?: string;
}

export const UnreadDot = ({ channelId, conversationId }: UnreadDotProps) => {
  const { getUnreadByChannel, getUnreadByConversation } = useNotifications();
  
  // Convex queries automatically update when notifications change
  // No need for socket events or manual refresh
  const hasUnread = channelId 
    ? getUnreadByChannel(channelId) > 0 
    : conversationId 
    ? getUnreadByConversation(conversationId) > 0 
    : false;

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
