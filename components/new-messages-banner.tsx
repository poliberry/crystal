"use client";

import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NewMessagesBannerProps {
  channelId?: string;
  conversationId?: string;
}

export const NewMessagesBanner = ({ channelId, conversationId }: NewMessagesBannerProps) => {
  const { 
    getUnreadByChannel, 
    getUnreadByConversation, 
    markAsRead, 
    markChannelAsRead,
    markConversationAsRead,
    notifications 
  } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  const unreadCount = channelId 
    ? getUnreadByChannel(channelId) 
    : conversationId 
    ? getUnreadByConversation(conversationId) 
    : 0;

  const relevantNotifications = notifications.filter(n => 
    !n.read && 
    n.type === "MESSAGE" && 
    (channelId ? n.channelId === channelId : n.conversationId === conversationId)
  );

  // Auto-mark as read when user enters the channel/conversation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (unreadCount > 0) {
        if (channelId) {
          markChannelAsRead(channelId);
        } else if (conversationId) {
          markConversationAsRead(conversationId);
        }
        setDismissed(true);
      }
    }, 5000); // Auto-mark as read after 5 seconds (longer delay)

    return () => clearTimeout(timer);
  }, [channelId, conversationId, unreadCount, markChannelAsRead, markConversationAsRead]);

  const handleMarkAsRead = async () => {
    if (channelId) {
      await markChannelAsRead(channelId);
    } else if (conversationId) {
      await markConversationAsRead(conversationId);
    }
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (unreadCount === 0 || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 flex items-center justify-between border-b"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {unreadCount} new message{unreadCount > 1 ? "s" : ""}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAsRead}
            className="text-white hover:bg-blue-500 dark:hover:bg-blue-600 text-xs h-7"
          >
            Mark as Read
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="text-white hover:bg-blue-500 dark:hover:bg-blue-600 h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
