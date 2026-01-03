import { ChannelType, MemberRole } from "@/types/conversation";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video, Plus, Users, MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { ServerChannelList } from "./server-channel-list";
import { ServerHeader } from "./server-header";
import { ConversationSearch } from "./conversation-search";
import { ConversationHeader } from "./conversation-header";
import { ConversationSidebarClient } from "./conversation-sidebar-client";
import { UserCard } from "../navigation/user-card";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/action-tooltip";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const ConversationSidebar = () => {
  const { user } = useAuthStore();
  const profile = useQuery(api.profiles.getCurrent, user?.userId ? { userId: user.userId } : "skip");

  if (!profile) redirect("/");
  try {
    // Get conversations for this profile directly
    const conversationMembers = useQuery(api.conversations.getMyConversations, {
      userId: user?.userId,
    });

    const conversations = conversationMembers?.map((cm) => cm?._id as Id<"conversations">);

    return (
      <ConversationSidebarClient
        initialConversations={conversations ?? []}
        currentProfile={profile}
      />
    );
  } catch (error) {
    console.error("Error loading conversations:", error);
    return (
      <div className="flex flex-col h-full text-primary w-full bg-transparent">
        <ConversationHeader currentProfile={profile} />
        <ScrollArea className="flex-1 px-3">
          <div className="mt-2">
            <div className="mb-2 p-4 text-center text-muted-foreground">
              <p>No conversations</p>
              <p className="text-xs mt-1">Go ahead and create one!</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }
};
