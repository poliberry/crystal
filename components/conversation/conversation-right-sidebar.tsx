"use client";

import { usePathname } from "next/navigation";
import { ConversationType, Profile } from "@/types/conversation";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MoreVertical, 
  UserPlus, 
  Settings, 
  LogOut,
  Phone,
  Video,
  MessageSquare,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserDialog } from "@/components/user-dialog";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { GroupAvatar } from "../group-avatar";
import { useModal } from "@/hooks/use-modal-store";

export function ConversationRightSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  
  // Extract conversationId from pathname
  const rawConversationId = pathname?.includes('/conversations/') 
    ? pathname.split('/conversations/')[1]?.split('?')[0]
    : null;
  
  // Validate conversationId - ensure it's not undefined, empty, or the string "undefined"
  const conversationId = rawConversationId && 
    rawConversationId !== "undefined" && 
    rawConversationId !== "" &&
    rawConversationId !== "null" &&
    typeof rawConversationId === "string" &&
    rawConversationId.length > 0
    ? rawConversationId
    : null;

  // Get current user's profile
  const currentProfile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  // Get conversation from Convex
  const conversation = useQuery(
    api.conversations.getById,
    conversationId && user?.userId
      ? { conversationId: conversationId as Id<"conversations">, userId: user.userId }
      : "skip"
  );

  if (conversation === undefined || currentProfile === undefined) {
    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </aside>
    );
  }

  if (!conversation || !currentProfile) {
    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0">
        &nbsp;
      </aside>
    );
  }

  if (conversation.type === "DIRECT_MESSAGE") {
    // Show user profile for DM - find the other member (not the current user)
    const otherMember = conversation.members?.find((m: any) => {
      const memberProfileId = m.profileId || m.profile?._id || m.profile?.id;
      const currentProfileId = currentProfile._id;
      return memberProfileId && memberProfileId !== currentProfileId;
    });
    const profile = otherMember?.profile;

    if (!profile) return null;

    const getStatusColor = (status: string) => {
      switch (status) {
        case "ONLINE":
          return "bg-green-500";
        case "IDLE":
          return "bg-yellow-500";
        case "DND":
          return "bg-red-500";
        case "INVISIBLE":
        case "OFFLINE":
        default:
          return "bg-gray-500";
      }
    };

    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 pr-2 relative">
        <div className="relative">
          {/* Mini Banner */}
          <div className="h-20 bg-gradient-to-r from-blue-500 to-purple-600 relative">
            {profile?.bannerUrl && (
              <img
                src={profile.bannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Content */}
          <div className="p-4 pt-3 space-y-3">
            {/* Avatar and basic info */}
            <div className="flex items-start gap-3 -mt-12 -ml-2">
              <div className="relative">
                <Avatar className="w-20 h-20 border-[5px] bg-sidebar after:border-none border-card rounded-none">
                  <AvatarImage
                    src={profile?.imageUrl}
                    alt={profile?.name}
                    className="rounded-none"
                  />
                  <AvatarFallback className="rounded-none">
                    {profile?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0">
                  <div
                    className={cn(
                      "w-6 h-6 border-[5px] border-card",
                      getStatusColor(profile?.status || "OFFLINE")
                    )}
                  />
                </div>
              </div>
              {profile?.presenceStatus && (
                <div className="bg-background border border-border rounded-lg px-3 py-2 z-[10] shadow-sm max-w-48 mt-10">
                  <p className="text-sm text-foreground truncate">
                    {profile.presenceStatus}
                  </p>
                </div>
              )}
            </div>

            <div className="min-w-0">
              {/* Display Name and Username */}
              <h3 className="font-bold leading-tight text-foreground text-lg truncate">
                {profile?.globalName || profile?.name}
              </h3>
              <p className="text-[10.5px] text-muted-foreground truncate">
                @{profile?.name} {profile?.pronouns ? `| ${profile?.pronouns}` : ""}
              </p>
            </div>

            {/* Quick bio */}
            <div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {profile?.bio ||
                  "This user hasn't written anything about themselves yet."}
              </p>
            </div>

            {/* Quick info */}
            <div className="space-y-1.5 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Joined {dayjs(profile?.createdAt).format("MMM YYYY")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  } else {
    // Show group members for group conversations
    const { onOpen } = useModal();
    
    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border">
        {/* Header with Group Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <GroupAvatar
              members={conversation.members || []}
              imageUrl={conversation.imageUrl}
              size={48}
              className="rounded-none"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {conversation.name || "Group Chat"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {conversation.members?.length || 0} member{(conversation.members?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpen("editGroup", { conversation })}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Group
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Group Members List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {conversation.members?.map((member: any) => {
              const memberProfile = member.profile || member.member?.profile;
              const profileId = memberProfile?._id || memberProfile?.id || member.profileId;
              
              return (
                <UserDialog 
                  key={member._id || member.id || profileId} 
                  profileId={profileId}
                  mode="dialog"
                >
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                    <UserAvatar
                      src={memberProfile?.imageUrl}
                      alt={memberProfile?.globalName || memberProfile?.name}
                      className="h-8 w-8"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {memberProfile?.globalName || memberProfile?.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {memberProfile?.status || "OFFLINE"}
                      </p>
                    </div>
                  </div>
                </UserDialog>
              );
            })}
          </div>
        </div>
      </aside>
    );
  }
}
