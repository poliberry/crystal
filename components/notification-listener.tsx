"use client";
import { useNovu } from "@novu/react";
import { useEffect, useState } from "react";
import type { Notification as INotification } from "@novu/react";
import { toast } from "sonner";
import Image from "next/image";
import { useModal } from "@/hooks/use-modal-store";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import axios from "axios";
import {
  sendNotification,
  requestPermission,
  isPermissionGranted,
} from "@tauri-apps/plugin-notification";

type AppNotificationPayload =
  | {
      type: "incoming-dm-call";
      conversationId: string;
      conversationName?: string;
      callerId: string;
      callerName: string;
      imageUrl?: string;
      isVideo: boolean;
    }
  | {
      type: "message";
      channelId: string;
    };

type NotificationWithPayload = INotification & {
  payload?: AppNotificationPayload;
};

// Check if running in Tauri
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

function NotificationListener() {
  const novu = useNovu();
  const { onOpen } = useModal();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [tauriNotification, setTauriNotification] = useState<any>(null);

  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (isTauri) {
        const permission = await requestPermission();
        if (permission === "granted") {
          console.log("Notification permission granted");
        } else {
          console.log("Notification permission not granted");
        }
      }
    };
    checkNotificationPermission();
  }, [isTauri, requestPermission]);

  useEffect(() => {
    if (!novu) {
      return;
    }

    // Handler for new notifications
    const handleNewNotification = async ({
      result,
    }: {
      result: NotificationWithPayload;
    }) => {
      console.log("New notification:", result.subject);
      console.log("Full notification result:", result);

      // Check if this is an incoming DM call notification
      // Novu notifications store custom data in result.data or result.payload
      const payload = result.data;

      console.log("Extracted payload:", payload);

      if (payload?.type === "incoming-dm-call") {
        // This is an incoming call notification - open the DM call modal
        onOpen("dmCall", {
          callData: {
            conversationId: payload.conversationId,
            conversationName: payload.conversationName || "Direct Message",
            caller: {
              name: payload.callerName,
              avatar: payload.imageUrl,
              id: payload.callerId,
            },
            type: payload.isVideo === "true" ? "video" : "audio",
          },
        });
        return; // Don't show toast for call notifications
      }

      // Check if the user is currently viewing the channel/conversation where the message was sent
      // If the sender is the current user and they're viewing that channel, skip notification
      const isSender = payload?.senderUserId === user?.userId;
      let isViewingChannel = false;

      if (isSender) {
        // Check if user is viewing the conversation/channel
        if (payload?.conversationId) {
          // Check if pathname matches conversation route
          isViewingChannel =
            pathname === `/conversations/${payload.conversationId}`;
        } else if (payload?.channelId) {
          // For channel messages, check if pathname matches channel route
          // Pathname format: /servers/[serverId]/channels/[channelId]
          isViewingChannel =
            pathname?.includes(`/channels/${payload.channelId}`) || false;
        }

        if (isViewingChannel) {
          // User is viewing the channel and sent the message - auto-archive the notification
          try {
            // Mark notification as read/archived on Novu
            // Use the Novu API to mark the notification as read
            if (result.id && user?.userId) {
              const response = await axios.post(
                `/api/notifications/mark-read`,
                {
                  notificationId: result.id,
                  subscriberId: user.userId,
                }
              );

              if (response.status === 200) {
                console.log(
                  "Notification auto-archived - user is viewing the channel"
                );
              }
            }
          } catch (error) {
            console.error("Failed to archive notification:", error);
          }
          return; // Don't show toast notification
        }
      }

      const title = result.subject || "New Notification";
      const body = result.body || "";
      const icon = result.avatar || "/logo.png";

      // Show in-app toast notification
      toast(title, {
        description: body,
        duration: 5000,
        action: {
          label: "View message",
          onClick: () => {
            window.open(result.primaryAction?.redirect?.url || "", "_blank");
          },
        },
      });

      // Send system notification
      if (isTauri && tauriNotification) {
        // Use Tauri notification plugin
        try {
          const permission = await requestPermission();
          if (permission === "granted") {
            try {
              await sendNotification({
                title: title,
                body: body,
                icon: icon,
              });
            } catch (error) {
              console.error("Failed to send Tauri notification:", error);
            }
          }
        } catch (error) {
          console.error("Failed to send Tauri notification:", error);
        }
      } else {
        // Use browser Notification API
        sendBrowserNotification(title, body, icon);
      }
    };

    // Handler for unread count changes
    const handleUnreadCountChanged = ({
      result,
    }: {
      result: { total: number; severity: Record<string, number> };
    }) => {
      // Update document title to show unread count
      const unreadCount = result.total;
      document.title =
        unreadCount > 0 ? `(${unreadCount}) ${document.title}` : document.title;

      // Note: Desktop apps don't have a standard badge API like mobile apps
      // The unread count is shown in the document title instead
      // On some platforms, the window title may appear in the taskbar/dock
    };

    // Subscribe to events
    novu.on("notifications.notification_received", handleNewNotification);
    novu.on("notifications.unread_count_changed", handleUnreadCountChanged);

    // Cleanup function
    return () => {
      novu.off("notifications.notification_received", handleNewNotification);
      novu.off("notifications.unread_count_changed", handleUnreadCountChanged);
    };
  }, [novu, onOpen, pathname, user?.userId]);

  return null; // This component doesn't render anything
}

// Helper function for browser notifications
async function sendBrowserNotification(
  title: string,
  body: string,
  icon: string
) {
  let permissionGranted = Notification.permission === "granted";

  // If not we need to request it
  if (!permissionGranted) {
    const permission = await Notification.requestPermission();
    permissionGranted = permission === "granted";
  }

  // Once permission has been granted we can send the notification
  if (permissionGranted) {
    new Notification(title, { body: body, icon: icon });
  }
}

export default NotificationListener;
