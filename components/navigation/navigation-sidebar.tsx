import { SignOutButton, SignedIn, currentUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

import { NavigationAction } from "./navigation-action";
import { NavigationItem } from "./navigation-item";
import { UserCard } from "./user-card";
import { TopNavigationBar } from "./top-navigation-bar";
import { ConversationNotificationBar } from "./conversation-notification-bar";
import { Separator } from "../ui/separator";
import { NotificationBadge } from "../notification-badge";

export const NavigationSidebar = async () => {
  const profile = await currentProfile();

  if (!profile) redirect("/");

  console.log('Navigation sidebar - profile:', profile);

  // First get all memberships for this profile
  let servers = [];
  try {
    console.log('Fetching members for profile:', profile.id);
    const members = await db.member.findMany({
      profileId: profile.id,
    });
    console.log('Found members:', members);

    // Then get the servers for those memberships
    for (const member of members) {
      console.log('Fetching server for member:', member.serverId);
      const server = await db.server.findFirst({
        id: member.serverId,
      });
      console.log('Found server:', server);
      if (server) {
        servers.push(server);
      }
    }
    
    console.log('Final servers list:', servers);
  } catch (error) {
    console.error('Error loading servers in navigation:', error);
    // Return empty servers array on error
    servers = [];
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
          {servers.map((server) => (
            <div key={server.id}>
              <NavigationItem
                id={server.id}
                name={server.name}
                imageUrl={server.imageUrl}
              />
            </div>
          ))}
          <NavigationAction />
        </div>

        <div className="justify-self-end flex items-center">
          <UserCard profile={profile} />
        </div>
      </div>
    </div>
  );
};
