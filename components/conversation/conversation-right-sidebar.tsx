"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Profile, ConversationType } from "@prisma/client";
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
  MessageSquare
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

interface ConversationData {
  id: string;
  type: ConversationType;
  name?: string;
  members: Array<{
    member: {
      id: string;
      profile: Profile;
    };
  }>;
}

export function ConversationRightSidebar() {
  const pathname = usePathname();
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConversationData = async () => {
      if (!pathname?.includes('/conversations/')) return;
      
      const conversationId = pathname.split('/conversations/')[1]?.split('?')[0];
      if (!conversationId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/conversations/${conversationId}/details`);
        if (response.ok) {
          const data = await response.json();
          setConversation(data);
        }
      } catch (error) {
        console.error("Failed to fetch conversation details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();
  }, [pathname]);

  if (loading) {
    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </aside>
    );
  }

  if (!conversation) {
    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0">
        &nbsp;
      </aside>
    );
  }

  if (conversation.type === ConversationType.DIRECT_MESSAGE) {
    // Show user profile for DM
    const otherMember = conversation.members?.find(m => m.member.profile);
    const profile = otherMember?.member.profile;

    if (!profile) return null;

    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border">
        {/* Header */}
        <div className="p-1.5 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground pl-2">User Profile</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Phone className="h-4 w-4 mr-2" />
                  Voice Call
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Video className="h-4 w-4 mr-2" />
                  Video Call
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* User Profile Content */}
        <div className="flex-1 p-4 space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center text-center space-y-3">
            <UserAvatar
              src={profile.imageUrl}
              alt={profile.globalName || profile.name}
              className="h-20 w-20"
            />
            <div>
              <h4 className="text-lg font-semibold text-foreground">
                {profile.globalName || profile.name}
              </h4>
              {profile.globalName && (
                <p className="text-sm text-muted-foreground">
                  @{profile.name}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {profile.status || "OFFLINE"}
            </Badge>
          </div>

          {/* Bio Section */}
          {profile.bio && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-foreground">About</h5>
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          {/* User Details */}
          <div className="space-y-4">
            <div>
              <h5 className="text-sm font-medium text-foreground mb-2">Details</h5>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Member since</span>
                  <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
                {profile.pronouns && (
                  <div className="flex justify-between">
                    <span>Pronouns</span>
                    <span>{profile.pronouns}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <UserDialog profileId={profile.id} mode="dialog">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </UserDialog>
          </div>
        </div>
      </aside>
    );
  } else {
    // Show group members for group conversations
    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border">
        {/* Header */}
        <div className="p-1.5 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              Members ({conversation.members?.length || 0})
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Group Settings
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
            {conversation.members?.map((member) => (
              <UserDialog 
                key={member.member.id} 
                profileId={member.member.profile.id}
                mode="dialog"
              >
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                  <UserAvatar
                    src={member.member.profile.imageUrl}
                    alt={member.member.profile.globalName || member.member.profile.name}
                    className="h-8 w-8"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.member.profile.globalName || member.member.profile.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.member.profile.status || "OFFLINE"}
                    </p>
                  </div>
                </div>
              </UserDialog>
            ))}
          </div>
        </div>
      </aside>
    );
  }
}
