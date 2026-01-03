"use client";

import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

import { NavigationAction } from "./navigation-action";
import { NavigationItem } from "./navigation-item";
import { UserCard } from "./user-card";
import { TopNavigationBar } from "./top-navigation-bar";
import { ConversationNotificationBar } from "./conversation-notification-bar";
import { Separator } from "../ui/separator";
import { NotificationBadge } from "../notification-badge";

export const NavigationSidebar = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const servers = useQuery(
    api.servers.getMyServers,
    user?.userId ? { userId: user.userId } : "skip"
  );

  if (profile === undefined || servers === undefined) {
    return (
      <div className="flex items-center justify-center h-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    router.push("/sign-in");
    return null;
  }

  const CARD_HEIGHT = 499;

  return (
    <div className="flex flex-col w-full">
      {/* Top Navigation Bar */}
      <TopNavigationBar />
      
      {/* Server Navigation Bar */}
      <div className="flex flex-row items-center h-12 text-primary w-full border-b bg-white dark:bg-black py-3">
        <Link href="/conversations" className="group flex items-center">
          <div className="relative flex mx-1 rounded-[16px] transition-all overflow-hidden items-center justify-center group-hover:bg-zinc-500 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <Image
              src="/logo.svg"
              alt="Discord Clone"
              width={40}
              height={40}
              className="rounded-full transition"
            />
            <NotificationBadge 
              type="conversation" 
              className="top-0 right-0 -translate-y-1 translate-x-1" 
            />
          </div>
        </Link>

        {/* Conversation Notification Bar */}
        <ConversationNotificationBar />

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className={`w-full flex items-center h-12 m-0 overflow-x-auto`}>
          {servers?.map((server) => (
            <div key={server?._id as Id<"servers">}>
              <NavigationItem
                id={server?._id as Id<"servers">}
                name={server?.name ?? ""}
                imageUrl={server?.imageUrl ?? ""}
              />
            </div>
          ))}
          <NavigationAction />
        </div>

        <div className="justify-self-end flex items-center">
          <UserCard />
        </div>
      </div>
    </div>
  );
};
