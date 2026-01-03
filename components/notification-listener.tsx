"use client";
import { useNovu } from "@novu/react";
import { useEffect } from "react";
import type { Notification as INotification } from "@novu/react";
import { toast } from "sonner";
import Image from "next/image";
import { useModal } from "@/hooks/use-modal-store";

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

function NotificationListener() {
  const novu = useNovu();
  const { onOpen } = useModal();

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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
            type: payload.isVideo === 'true' ? "video" : "audio",
          },
        });
        return; // Don't show toast for call notifications
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
  }, [novu, onOpen]);

  return null; // This component doesn't render anything
}

export default NotificationListener;
