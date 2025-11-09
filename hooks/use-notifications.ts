"use client";

import { useSocket } from "@/components/providers/socket-provider";
import { useUser } from "@clerk/nextjs";
import { Notification } from "@/types/conversation";
import { useEffect, useState } from "react";

type NotificationWithDetails = Notification & {
  triggeredBy?: {
    name: string;
    imageUrl: string;
  };
  server?: {
    name: string;
    imageUrl: string;
  };
  channel?: {
    name: string;
  };
  conversation?: {
    name?: string;
    type?: string;
  };
};

export const useNotifications = () => {
  const { socket } = useSocket();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch existing notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: NotificationWithDetails) => !n.read).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Listen for new notifications via socket
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notification: NotificationWithDetails) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleConversationMarkRead = (data: { conversationId: string, profileId: string }) => {
      // Update notifications to mark conversation as read
      setNotifications(prev => 
        prev.map(n => 
          n.conversationId === data.conversationId && n.type === "MESSAGE" 
            ? { ...n, read: true } 
            : n
        )
      );
      // Recalculate unread count
      setUnreadCount(prev => {
        const conversationUnread = notifications.filter(n => 
          n.conversationId === data.conversationId && !n.read && n.type === "MESSAGE"
        ).length;
        return Math.max(0, prev - conversationUnread);
      });
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("conversation:marked-as-read", handleConversationMarkRead);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("conversation:marked-as-read", handleConversationMarkRead);
    };
  }, [socket, user, notifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: "PATCH",
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (!notifications.find(n => n.id === notificationId)?.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Failed to clear notification:", error);
    }
  };

  const getUnreadByChannel = (channelId: string): number => {
    return notifications.filter(n => 
      n.channelId === channelId && !n.read && n.type === "MESSAGE"
    ).length;
  };

  const getUnreadByConversation = (conversationId: string): number => {
    return notifications.filter(n => 
      n.conversationId === conversationId && !n.read && n.type === "MESSAGE"
    ).length;
  };

  const getUnreadByServer = (serverId: string): number => {
    return notifications.filter(n => 
      n.serverId === serverId && !n.read && n.type === "MESSAGE"
    ).length;
  };

  const getTotalUnreadConversations = (): number => {
    const conversationIds = new Set(
      notifications
        .filter(n => n.conversationId && !n.read && n.type === "MESSAGE")
        .map(n => n.conversationId)
    );
    return conversationIds.size;
  };

  const markChannelAsRead = async (channelId: string) => {
    try {
      const response = await fetch("/api/notifications/mark-read-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.channelId === channelId && n.type === "MESSAGE" 
              ? { ...n, read: true } 
              : n
          )
        );
        // Recalculate unread count
        const unreadAfterMark = notifications.filter(n => 
          !(n.channelId === channelId && n.type === "MESSAGE") && !n.read
        ).length;
        setUnreadCount(unreadAfterMark);
      }
    } catch (error) {
      console.error("Failed to mark channel as read:", error);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const response = await fetch("/api/notifications/mark-read-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.conversationId === conversationId && n.type === "MESSAGE" 
              ? { ...n, read: true } 
              : n
          )
        );
        // Recalculate unread count
        const unreadAfterMark = notifications.filter(n => 
          !(n.conversationId === conversationId && n.type === "MESSAGE") && !n.read
        ).length;
        setUnreadCount(unreadAfterMark);
      }
    } catch (error) {
      console.error("Failed to mark conversation as read:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    markChannelAsRead,
    markConversationAsRead,
    getUnreadByChannel,
    getUnreadByConversation,
    getUnreadByServer,
    getTotalUnreadConversations,
    refreshNotifications: fetchNotifications,
  };
};
