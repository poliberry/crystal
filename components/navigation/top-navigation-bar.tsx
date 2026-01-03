"use client";

import { usePathname, useParams } from "next/navigation";
import { Bell, HelpCircle, Hash, Users, MessageCircle } from "lucide-react";
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
import { useAuthStore } from "@/lib/auth-store";
import { useDND } from "@/components/providers/dnd-provider";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./notification-item";
import { useNotifications } from "@/hooks/use-notifications";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "../ui/input";
import { IconMessageChatbot, IconPlus, IconSearch } from "@tabler/icons-react";
import { UserCard } from "./user-card";
import { useModal } from "@/hooks/use-modal-store";
import NovuInbox from "@/components/inbox/NovuInbox";
import { Inbox } from "@novu/nextjs";
import { dark } from "@novu/nextjs/themes";

export const TopNavigationBar = () => {
  const pathname = usePathname();
  const params = useParams();
  const { user } = useAuthStore();
  const { checkNotificationPermission } = useDND();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { onOpen: onOpenCreateServerModal } = useModal();

  const getServers = useQuery(
    api.servers.getMyServers,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const currentServer = getServers?.find(
    (server: any) => server._id === params?.serverId
  );

  // Don't show on root or loading pages
  if (pathname === "/" || pathname === "/loading") {
    return null;
  }

  // Show native notifications for new items
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotification = notifications[0];
      if (!latestNotification.read) {
        checkNotificationPermission().then((canReceive) => {
          if (
            canReceive &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(latestNotification.title || "New notification", {
              body: latestNotification.content || "",
              icon: latestNotification.triggeredBy?.imageUrl || "/favicon.ico",
            });
          }
        });
      }
    }
  }, [notifications, checkNotificationPermission]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const tabs = [
    // Basic tab with no filtering (shows all notifications)
    {
      label: "All",
      filter: { tags: [] },
    },

    // Filter by tags - shows notifications from workflows tagged "promotions"
    {
      label: "Promotions",
      filter: { tags: ["promotions"] },
    },

    // Filter by multiple tags - shows notifications with either "security" OR "alert" tags
    {
      label: "Security",
      filter: { tags: ["security", "alert"] },
    },

    // Filter by data attributes - shows notifications with priority="high" in payload
    {
      label: "High Priority",
      filter: { data: { priority: "high" } },
    },

    // Combined filtering - shows notifications that:
    // 1. Come from workflows tagged "alert" AND
    // 2. Have priority="high" in their data payload
    {
      label: "Critical Alerts",
      filter: { tags: ["alert"], data: { priority: "high" } },
    },
  ];

  return (
    <div className="h-12 bg-sidebar flex items-center justify-between py-1 px-3">
      {/* Left side - Page info */}
      <div className="flex items-center gap-2">
        <Link href="/conversations" className="group flex items-center">
          <Button variant="ghost" size="icon" className="p-0.5">
            <svg
              viewBox="0 0 31 31"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
            >
              <g>
                <path
                  d="M15.4678 3.51331H15.4814C22.0554 3.51351 27.371 8.73181 27.3711 15.0797C27.3711 17.5242 26.5665 19.9157 25.083 21.8942L24.6455 22.4781L25.0674 23.0729L27.3232 26.2526L27.3271 26.2565C27.3652 26.3095 27.3789 26.3986 27.335 26.4899C27.274 26.5895 27.1711 26.6461 27.0693 26.6461H15.4678C8.89372 26.6459 3.57812 21.4277 3.57812 15.0797C3.57825 8.83081 8.7293 3.67666 15.1611 3.51721L15.4678 3.51331ZM15.4678 4.02698C9.25534 4.02718 4.15637 8.96197 4.15625 15.0797C4.15625 21.1976 9.25526 26.1332 15.4678 26.1334H26.5469L25.4219 24.5533L25.1426 24.1608H25.1689L24.0264 22.5758C23.9588 22.4821 23.9733 22.3657 24.0342 22.2985L24.04 22.2916L24.0469 22.2838C25.7981 20.2734 26.7803 17.7295 26.7803 15.0797C26.7801 8.96185 21.6804 4.02698 15.4678 4.02698Z"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </g>
              <g>
                <path
                  d="M20.7607 10.5031C19.8262 9.48555 18.611 8.76792 17.2687 8.44098C15.9264 8.11404 14.5173 8.19247 13.2196 8.66637C11.9219 9.14027 10.7938 9.98834 9.97812 11.1033C9.16239 12.2184 8.69562 13.5502 8.63683 14.9305C8.57804 16.3108 8.92987 17.6775 9.64784 18.8578C10.3658 20.0382 11.4176 20.9791 12.6704 21.5616C13.9231 22.1441 15.3204 22.3421 16.6857 22.1305C18.0509 21.9189 19.3227 21.3072 20.3403 20.3727L18.5846 18.4608C17.9451 19.048 17.1459 19.4323 16.288 19.5653C15.4301 19.6983 14.5521 19.5739 13.7649 19.2078C12.9777 18.8418 12.3167 18.2505 11.8656 17.5088C11.4144 16.7671 11.1933 15.9083 11.2303 15.041C11.2672 14.1736 11.5605 13.3367 12.0731 12.636C12.5857 11.9354 13.2946 11.4025 14.11 11.1047C14.9255 10.8069 15.8109 10.7576 16.6544 10.963C17.4979 11.1685 18.2615 11.6194 18.8487 12.2589L20.7607 10.5031Z"
                  fill="currentColor"
                />
              </g>
            </svg>
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger>
            {currentServer ? (
              <Button
                variant="ghost"
                className="flex flex-row items-center gap-2 px-1 py-0.75 h-fit"
              >
                <Image
                  src={currentServer?.imageUrl ?? ""}
                  alt={currentServer?.name ?? ""}
                  width={25}
                  height={25}
                />
                <span className="text-sm font-medium">
                  {currentServer?.name ?? ""}
                </span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-row items-center gap-2 p-1 h-fit"
              >
                <IconMessageChatbot className="w-4 h-4" />
                <span className="text-sm font-medium">Communities</span>
              </Button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-96 border-1 border-border"
          >
            <ScrollArea className="h-96 p-2">
              <div className="flex flex-row items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-0.5"
                  onClick={() => onOpenCreateServerModal("createServer")}
                >
                  <IconPlus className="w-4 h-4" />
                </Button>
              </div>
              {getServers?.map((server: any) => (
                <Link href={`/servers/${server._id}`} key={server._id}>
                  <Button variant="outline" className="h-fit">
                    <DropdownMenuItem className="cursor-pointer flex flex-col items-center justify-center w-fit">
                      <Image
                        src={server.imageUrl ?? ""}
                        alt={server.name ?? ""}
                        width={25}
                        height={25}
                      />
                      <span className="text-sm font-medium">
                        {server.name ?? ""}
                      </span>
                    </DropdownMenuItem>
                  </Button>
                </Link>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 w-[40%]">
        <Input placeholder="Search for anything..." className="w-full" />
      </div>
      {/* Right side - Actions */}
      <div className="flex flex-row items-center gap-2">
        <UserCard />
        {/* Notifications */}
        <div className="flex flex-row items-center gap-2">
          <NovuInbox subscriber={{
            subscriberId: user?.userId as string,
            email: user?.email as string,
            firstName: user?.name as string,
          }} />
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className="cursor-pointer">
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

        {/* Help */}
      </div>
    </div>
  );
};
