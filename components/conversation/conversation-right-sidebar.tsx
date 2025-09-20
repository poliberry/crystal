"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Profile, ConversationType, UserStatus } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle,
  Phone,
  Video,
  UserPlus,
  Settings,
  Calendar,
  Shield,
  Crown,
  MoreHorizontal,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useLiveKit } from "@/components/providers/media-room-provider";
import { UserDialog } from "@/components/user-dialog";
import { usePusher } from "@/components/providers/pusher-provider";

interface ConversationData {
  id: string;
  type: ConversationType;
  name?: string;
  members: Array<{
    id: string;
    conversationId: string;
    profileId: string;
    profile: Profile;
    memberId?: string | null;
    joinedAt: Date;
    leftAt: Date | null;
    lastReadAt: Date | null;
  }>;
}

interface UserProfileData extends Profile {
  bio: string | null;
  pronouns: string | null;
  bannerUrl: string | null;
  memberSince?: Date;
}

export function ConversationRightSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const media = useLiveKit();
  const { pusher, isConnected } = usePusher();
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [otherProfile, setOtherProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingCall, setCreatingCall] = useState(false);

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const profile = await response.json();
          setCurrentProfile(profile);
        }
      } catch (error) {
        console.error("Failed to fetch current profile:", error);
      }
    };

    fetchCurrentProfile();
  }, []);

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
          console.log("Conversation data:", data);
          setConversation(data);
          
          // Find the other user in the conversation
          if (data.type === 'DIRECT_MESSAGE' && currentProfile) {
            console.log("Looking for other member, current profile:", currentProfile.id);
            console.log("Members:", data.members);
            const otherMember = data.members.find(
              (m: any) => m.profile && m.profile.id !== currentProfile.id
            );
            console.log("Found other member:", otherMember);
            
            if (otherMember) {
              // Fetch the full profile using the profile API endpoint
              try {
                const profileResponse = await fetch(`/api/profile/${otherMember.profile.id}`);
                if (profileResponse.ok) {
                  const fullProfile = await profileResponse.json();
                  console.log("Full profile loaded:", fullProfile);
                  setOtherProfile(fullProfile);
                } else {
                  console.error("Failed to fetch full profile:", profileResponse.status);
                  // Fallback to the basic profile data
                  setOtherProfile(otherMember.profile);
                }
              } catch (profileError) {
                console.error("Error fetching full profile:", profileError);
                // Fallback to the basic profile data
                setOtherProfile(otherMember.profile);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch conversation details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentProfile) {
      fetchConversationData();
    }
  }, [pathname, currentProfile]);

  // Listen for real-time status updates via Pusher
  useEffect(() => {
    if (!pusher || !isConnected || !otherProfile) return;

    const channel = pusher.subscribe("presence");

    const handleStatusUpdate = (data: { 
      userId: string; 
      status: UserStatus; 
      presenceStatus?: string | null;
      prevStatus?: UserStatus;
    }) => {
      // Update the other profile's status if this update is for them
      if (data.userId === otherProfile.userId) {
        console.log("[CONVERSATION_SIDEBAR] Received status update for other user:", data);
        setOtherProfile(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status,
            presenceStatus: data.presenceStatus !== undefined ? data.presenceStatus : prev.presenceStatus
          };
        });
      }
    };

    // Listen to multiple event types for comprehensive coverage
    channel.bind("user:status:update", handleStatusUpdate);
    channel.bind("user:presence:update", handleStatusUpdate);
    channel.bind("presence-status-update", handleStatusUpdate);

    return () => {
      channel.unbind("user:status:update", handleStatusUpdate);
      channel.unbind("user:presence:update", handleStatusUpdate);
      channel.unbind("presence-status-update", handleStatusUpdate);
      pusher.unsubscribe("presence");
    };
  }, [pusher, isConnected, otherProfile]);

  const getStatusColor = (status: UserStatus) => {
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

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case "ONLINE":
        return "Online";
      case "IDLE":
        return "Away";
      case "DND":
        return "Do Not Disturb";
      case "INVISIBLE":
        return "Invisible";
      case "OFFLINE":
      default:
        return "Offline";
    }
  };

  const startVoiceCall = async () => {
    if (!conversation || !otherProfile) return;

    setCreatingCall(true);
    try {
      const conversationName = otherProfile?.globalName || otherProfile?.name || "Voice Call";
      
      // Start the call
      media.joinConversation(conversation.id, conversationName, false, true);
      router.push(`/conversations/${conversation.id}?audio=true`);
    } catch (error) {
      console.error("Failed to start voice call:", error);
    } finally {
      setCreatingCall(false);
    }
  };

  const startVideoCall = async () => {
    if (!conversation || !otherProfile) return;

    setCreatingCall(true);
    try {
      const conversationName = otherProfile?.globalName || otherProfile?.name || "Video Call";
      
      // Start the call
      media.joinConversation(conversation.id, conversationName, true, true);
      router.push(`/conversations/${conversation.id}?video=true`);
    } catch (error) {
      console.error("Failed to start video call:", error);
    } finally {
      setCreatingCall(false);
    }
  };

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
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p>No conversation found</p>
          </div>
        </div>
      </aside>
    );
  }

  if (conversation.type !== "DIRECT_MESSAGE") {
    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p>Group conversation sidebar</p>
            <p className="text-xs">Coming soon</p>
          </div>
        </div>
      </aside>
    );
  }

  if (!otherProfile) {
    return (
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p>Loading user profile...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mt-2"></div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0 bg-background border-l border-border overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          {otherProfile?.bannerUrl && (
            <img
              src={otherProfile.bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Avatar positioned over banner */}
          <div className="absolute -bottom-10 left-4">
            <div className="relative">
              <Avatar className="w-20 h-20 border-[5px] border-background">
                <AvatarImage
                  src={otherProfile?.imageUrl}
                  alt={otherProfile?.name}
                />
                <AvatarFallback>
                  {otherProfile?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Presence indicator */}
              <div className="absolute bottom-0 right-0">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-[4px] border-background",
                    getStatusColor(otherProfile?.status as UserStatus)
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 pt-12 space-y-4 overflow-y-auto">
          {/* Basic info - no avatar here since it's in the banner */}
          <div className="min-w-0">
            {/* Display Name and Username */}
            <h3 className="font-bold leading-tight text-foreground text-xl truncate">
              {otherProfile?.globalName || otherProfile?.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              @{otherProfile?.name}
              {otherProfile?.pronouns && ` | ${otherProfile.pronouns}`}
            </p>
          </div>

          {/* Status Display */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                getStatusColor(otherProfile?.status as UserStatus)
              )}
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground">
                {getStatusText(otherProfile?.status as UserStatus)}
              </span>
              {otherProfile?.presenceStatus && (
                <p className="text-xs text-muted-foreground truncate">
                  {otherProfile.presenceStatus}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">About</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {otherProfile?.bio ||
                "This user hasn't written anything about themselves yet."}
            </p>
          </div>

          <Separator />

          {/* Member info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Member Info</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="text-muted-foreground">Joined </span>
                  <span className="text-foreground font-medium">
                    {dayjs(otherProfile?.createdAt).format("MMM DD, YYYY")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Actions</h4>
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full justify-start h-9"
                onClick={startVoiceCall}
                disabled={creatingCall}
              >
                <Phone className="h-4 w-4 mr-2" />
                {creatingCall ? "Starting..." : "Voice Call"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start h-9"
                onClick={startVideoCall}
                disabled={creatingCall}
              >
                <Video className="h-4 w-4 mr-2" />
                {creatingCall ? "Starting..." : "Video Call"}
              </Button>
              <UserDialog profileId={otherProfile.id} mode="dialog">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start h-9"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
              </UserDialog>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
