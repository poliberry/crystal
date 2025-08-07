"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { createContext, useContext, ReactNode } from "react";

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  getUnreadByChannel: (channelId: string) => number;
  getUnreadByConversation: (conversationId: string) => number;
  getUnreadByServer: (serverId: string) => number;
  getTotalUnreadConversations: () => number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const notificationHooks = useNotifications();

  return (
    <NotificationContext.Provider value={notificationHooks}>
      {children}
    </NotificationContext.Provider>
  );
};
