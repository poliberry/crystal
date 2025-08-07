import { ChannelType, MemberRole } from "@prisma/client";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video, Plus, Users, MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

import { ServerChannelList } from "./server-channel-list";
import { ServerHeader } from "./server-header";
import { ConversationSearch } from "./conversation-search";
import { ConversationHeader } from "./conversation-header";
import { ConversationSidebarClient } from "./conversation-sidebar-client";
import { SignedIn } from "@clerk/nextjs";
import { UserCard } from "../navigation/user-card";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/action-tooltip";

export const ConversationSidebar = async () => {
  const profile = await currentProfile();

  if (!profile) redirect("/");

  // Get member record
  const member = await db.member.findFirst({
    where: {
      profileId: profile.id,
    },
  });

  if (!member) redirect("/");

  try {
    // More efficient query using the junction table directly
    const conversationMembers = await db.conversationMember.findMany({
      where: {
        memberId: member.id,
        leftAt: null, // Only active conversations
      },
      include: {
        conversation: {
          include: {
            members: {
              where: {
                leftAt: null,
              },
              include: {
                member: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            directMessages: {
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
              include: {
                member: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            creator: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: "desc",
        },
      },
    });

    const conversations = conversationMembers.map((cm) => cm.conversation);

    return (
      <ConversationSidebarClient
        initialConversations={conversations}
        currentMember={member}
        currentProfile={profile}
      />
    );
  } catch (error) {
    console.error("Error loading conversations:", error);
    return (
      <div className="flex flex-col h-full text-primary w-full bg-transparent border-r border-l border-muted">
        <ConversationHeader currentMember={member} currentProfile={profile} />
        <ScrollArea className="flex-1 px-3 dark:bg-black bg-white">
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
