"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { Notification } from "@/types/conversation";

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
  const { user } = useAuthStore();
  const notifications = useQuery(
    api.notifications.getMyNotifications,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);
  const markConversationAsReadMutation = useMutation(api.notifications.markConversationAsRead);

  const markAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation({ notificationId: notificationId as any });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllAsReadMutation();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    // Note: Convex doesn't have a delete function for notifications yet
    // You may want to add one or just mark as read
    try {
      await markAsReadMutation({ notificationId: notificationId as any });
    } catch (error) {
      console.error("Failed to clear notification:", error);
    }
  };

  const getUnreadByChannel = (channelId: string): number => {
    return (notifications || []).filter(n => 
      n.channelId === channelId && !n.read && n.type === "MESSAGE"
    ).length;
  };

  const getUnreadByConversation = (conversationId: string): number => {
    return (notifications || []).filter(n => 
      n.conversationId === conversationId && !n.read && n.type === "MESSAGE"
    ).length;
  };

  const getUnreadByServer = (serverId: string): number => {
    return (notifications || []).filter(n => 
      n.serverId === serverId && !n.read && n.type === "MESSAGE"
    ).length;
  };

  const getTotalUnreadConversations = (): number => {
    const conversationIds = new Set(
      (notifications || [])
        .filter(n => n.conversationId && !n.read && n.type === "MESSAGE")
        .map(n => n.conversationId)
    );
    return conversationIds.size;
  };

  const markChannelAsReadMutation = useMutation(api.notifications.markChannelAsRead);

  const markChannelAsRead = async (channelId: string) => {
    try {
      await markChannelAsReadMutation({ channelId: channelId as any });
    } catch (error) {
      console.error("Failed to mark channel as read:", error);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      await markConversationAsReadMutation({
        conversationId: conversationId as any,
      });
    } catch (error) {
      console.error("Failed to mark conversation as read:", error);
    }
  };

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
    markAsRead,
    markAllAsRead,
    clearNotification,
    markChannelAsRead,
    markConversationAsRead,
    getUnreadByChannel,
    getUnreadByConversation,
    getUnreadByServer,
    getTotalUnreadConversations,
  };
};
