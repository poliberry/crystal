"use client";

import { usePathname, useParams } from "next/navigation";
import { Bell, HelpCircle, Hash, Users, MessageCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocket } from "@/components/providers/socket-provider";
import { useUser } from "@clerk/nextjs";
import { shouldReceiveNotifications } from "@/hooks/use-dnd-status";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./notification-item";

export const TopNavigationBar = () => {
  const pathname = usePathname();
  const params = useParams();
  const { socket } = useSocket();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageContext, setPageContext] = useState<{
    type: 'server' | 'conversation' | 'default';
    title: string;
    subtitle?: string;
    icon: any;
    avatar?: string;
  }>({
    type: 'default',
    title: 'Discord Clone',
    subtitle: 'Welcome',
    icon: Hash,
  });

  // Don't show on root or loading pages
  if (pathname === "/" || pathname === "/loading") {
    return null;
  }

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Check if user should receive notifications (not in DND mode)
      const userStatus = user?.publicMetadata?.presence as string || localStorage.getItem("user-presence-status");
      
      // Show native toast notification only if not in DND mode
      if (shouldReceiveNotifications(userStatus) && 
          typeof window !== "undefined" && 
          "Notification" in window && 
          Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.content,
          icon: notification.triggeredBy?.imageUrl || "/favicon.ico",
        });
      }
    };

    const handlePageContextUpdate = (context: any) => {
      // Convert string icons to actual components
      const iconMap: Record<string, any> = {
        "Hash": Hash,
        "Users": Users,
        "MessageCircle": MessageCircle,
      };
      
      const updatedContext = {
        ...context,
        icon: typeof context.icon === "string" ? iconMap[context.icon] || Hash : context.icon,
      };
      
      setPageContext(updatedContext);
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("page:context:update", handlePageContextUpdate);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("page:context:update", handlePageContextUpdate);
    };
  }, [socket]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const IconComponent = pageContext.icon || Hash;

  return (
    <div className="h-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4">
      {/* Left side - Page info */}
      <span>&nbsp;</span>
      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-auto relative p-1"
                >
                  <Inbox className="w-4 h-4" />
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full p-0 flex items-center justify-center text-xs"
                  />
                </Button>
              )}
            </div>
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">
                  No notifications
                </div>
              ) : (
                <div className="p-1">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <span>Keyboard Shortcuts</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Support</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <span>About</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
