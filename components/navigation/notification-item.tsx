"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Hash, Users, MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

dayjs.extend(relativeTime);

interface NotificationItemProps {
  notification: any;
  onMarkAsRead: (id: string) => void;
}

export const NotificationItem = ({
  notification,
  onMarkAsRead,
}: NotificationItemProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.conversationId) {
      router.push(`/conversations/${notification.conversationId}`);
    } else if (notification.serverId && notification.channelId) {
      router.push(`/servers/${notification.serverId}/channels/${notification.channelId}`);
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case "MESSAGE":
        if (notification.conversationId) {
          return notification.conversation?.type === "GROUP_MESSAGE" ? Users : MessageCircle;
        }
        return Hash;
      case "MENTION":
        return Hash;
      case "REPLY":
        return MessageCircle;
      default:
        return MessageCircle;
    }
  };

  const getLocationText = () => {
    if (notification.server && notification.channel) {
      return `#${notification.channel.name} • ${notification.server.name}`;
    }
    
    if (notification.conversation) {
      if (notification.conversation.type === "GROUP_MESSAGE") {
        return notification.conversation.name || "Group Chat";
      }
      return "Direct Message";
    }
    
    return "";
  };

  const IconComponent = getNotificationIcon();

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
        !notification.read ? "bg-blue-50 dark:bg-blue-950/20" : ""
      }`}
      onClick={handleClick}
    >
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={notification.triggeredBy?.imageUrl} />
        <AvatarFallback>
          <IconComponent className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {notification.title}
            </p>
            {notification.content && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1">
                {notification.content}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {getLocationText()}
              </p>
              <span className="text-xs text-zinc-400">•</span>
              <p className="text-xs text-zinc-400">
                {dayjs(notification.createdAt).fromNow()}
              </p>
            </div>
          </div>
          
          {/* Unread indicator */}
          {!notification.read && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
          )}
        </div>
      </div>
    </div>
  );
};
