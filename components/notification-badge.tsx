"use client";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";

interface NotificationBadgeProps {
  className?: string;
  serverId?: string;
  channelId?: string;
  conversationId?: string;
  type?: "server" | "channel" | "conversation" | "total";
}

export const NotificationBadge = ({ 
  className, 
  serverId, 
  channelId, 
  conversationId,
  type = "total" 
}: NotificationBadgeProps) => {
  const { 
    unreadCount, 
    getUnreadByChannel, 
    getUnreadByConversation, 
    getUnreadByServer,
    getTotalUnreadConversations 
  } = useNotifications();

  let count = 0;

  switch (type) {
    case "server":
      count = serverId ? getUnreadByServer(serverId) : 0;
      break;
    case "channel":
      count = channelId ? getUnreadByChannel(channelId) : 0;
      break;
    case "conversation":
      count = conversationId ? getUnreadByConversation(conversationId) : getTotalUnreadConversations();
      break;
    case "total":
    default:
      count = unreadCount;
      break;
  }

  if (count === 0) return null;

  return (
    <div
      className={cn(
        "absolute bg-red-500 text-white rounded-full text-xs font-medium min-w-[16px] h-4 flex items-center justify-center px-1",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </div>
  );
};
