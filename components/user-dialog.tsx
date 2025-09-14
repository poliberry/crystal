"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Profile, UserStatus } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Phone,
  UserPlus,
  Shield,
  Crown,
  Settings,
  MoreHorizontal,
  Calendar,
  Clock,
  ExternalLink,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useLiveKit } from "./providers/media-room-provider";
import { useSocket } from "./providers/pusher-provider";

interface UserDialogProps {
  children: React.ReactNode;
  profileId: string;
  serverId?: string;
  mode?: "popup" | "dialog";
}

interface UserProfileData {
  id: string;
  userId: string;
  name: string;
  globalName: string;
  imageUrl: string;
  bannerUrl: string;
  bio: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  pronouns: string | null;
  presenceStatus: string | null;
  memberSince?: Date | null;
}

export function UserDialog({
  children,
  profileId,
  serverId,
  mode = "popup",
}: UserDialogProps) {
  const router = useRouter();
  const { socket } = useSocket();
  const media = useLiveKit();
  const { user: currentUser } = useUser();
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  // Fetch current profile
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setCurrentProfile(data);
        }
      } catch (error) {
        console.error("Failed to fetch current profile:", error);
      }
    };

    if (currentUser) {
      fetchCurrentProfile();
    }
  }, [currentUser]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/profile/${profileId}?serverId=${serverId || ""}`
      );
      if (response.ok) {
        const userData = await response.json();
        setProfile(userData);
      } else {
        // Use dummy data if API fails
        setProfile(null);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      // Use dummy data on error
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

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

  const isCurrentUser = currentUser?.id === profileId;
  const displayProfile = profile || null;

  const createOrNavigateToConversation = async () => {
    if (!currentUser || !profileId) return;

    setCreatingConversation(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: [profileId],
          type: "DIRECT_MESSAGE",
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        setIsPopoverOpen(false);
        setIsDialogOpen(false);
        router.push(`/conversations/${conversation.id}`);
      }
    } catch (error) {
      console.error("Failed to create/navigate to conversation:", error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const startVoiceCall = async () => {
    if (!currentProfile || !profileId) return;

    setCreatingConversation(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: [profileId],
          type: "DIRECT_MESSAGE",
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        const conversationName =
          profile?.globalName || profile?.name || "Voice Call";

        // Emit websocket event
        socket?.emit("call:start", {
          conversationId: conversation.id,
          type: "voice",
          callerId: currentProfile.id,
          callerName: currentProfile.global_name || currentProfile.name,
          callerAvatar: currentProfile.image_url,
          participantIds: conversation.members?.map(
            (m: any) => m.member.profile.id
          ) || [profileId],
        });

        setIsPopoverOpen(false);
        setIsDialogOpen(false);

        // Start the call and navigate
        media.joinConversation(conversation.id, conversationName, true, false);
        router.push(`/conversations/${conversation.id}?audio=true`);
      }
    } catch (error) {
      console.error("Failed to start voice call:", error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const startVideoCall = async () => {
    if (!currentProfile || !profileId) return;

    setCreatingConversation(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: [profileId],
          type: "DIRECT_MESSAGE",
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        const conversationName =
          profile?.globalName || profile?.name || "Video Call";

        // Emit websocket event
        socket?.emit("call:start", {
          conversationId: conversation.id,
          type: "video",
          callerId: currentProfile.id,
          callerName: currentProfile.global_name || currentProfile.name,
          callerAvatar: currentProfile.image_url,
          participantIds: conversation.members?.map(
            (m: any) => m.member.profile.id
          ) || [profileId],
        });

        setIsPopoverOpen(false);
        setIsDialogOpen(false);

        // Start the call and navigate
        media.joinConversation(conversation.id, conversationName, true, true);
        router.push(`/conversations/${conversation.id}?video=true`);
      }
    } catch (error) {
      console.error("Failed to start video call:", error);
    } finally {
      setCreatingConversation(false);
    }
  };

  // Popup Card Content
  const PopupContent = () => (
    <div className="w-auto min-w-80 max-w-80 p-0 bg-background rounded-lg overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="relative">
          {/* Mini Banner */}
          <div className="h-20 bg-gradient-to-r from-blue-500 to-purple-600 relative">
            {displayProfile?.bannerUrl && (
              <img
                src={displayProfile.bannerUrl}
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
                <Avatar className="w-20 h-20 border-[5px] border-background">
                  <AvatarImage
                    src={displayProfile?.imageUrl}
                    alt={displayProfile?.name}
                  />
                  <AvatarFallback>
                    {displayProfile?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-[5px] border-background",
                      getStatusColor(displayProfile?.status as UserStatus)
                    )}
                  />
                </div>
              </div>
              {displayProfile?.presenceStatus &&
                displayProfile.presenceStatus.trim() !== "" &&
                displayProfile.presenceStatus.trim() !== "undefined" &&
                displayProfile.presenceStatus.trim() !== "null" && (
                  <div className="bg-background border border-border rounded-lg px-3 py-2 z-[10] shadow-sm max-w-48 mt-10">
                    <p className="text-sm text-foreground truncate">
                      {displayProfile.presenceStatus}
                    </p>
                  </div>
                )}
            </div>

            <div className="min-w-0">
              {/* Display Name and Username */}
              <h3 className="font-bold leading-tight text-foreground text-xl truncate">
                {displayProfile?.globalName || displayProfile?.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                @{displayProfile?.name} {displayProfile?.pronouns ? `| ${displayProfile?.pronouns}` : ""}
              </p>
            </div>

            {/* Quick bio */}
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayProfile?.bio ||
                  "This user hasn't written anything about themselves yet."}
              </p>
            </div>

            {/* Quick info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Joined {dayjs(displayProfile?.createdAt).format("MMM YYYY")}
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 pt-2">
              {!isCurrentUser && (
                <>
                  <Button
                    size="sm"
                    className="flex-1 h-9"
                    onClick={createOrNavigateToConversation}
                    disabled={creatingConversation}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {creatingConversation ? "Loading..." : "Message"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3"
                    onClick={startVoiceCall}
                    disabled={creatingConversation}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3"
                    onClick={startVideoCall}
                    disabled={creatingConversation}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setIsDialogOpen(true);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </>
              )}

              {isCurrentUser && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-9"
                  onClick={() => {
                    setIsPopoverOpen(false);
                    setIsDialogOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Full Dialog Content
  const DialogContent_Full = () => (
    <div className="relative">
      {/* Header Banner */}
      <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {displayProfile?.bannerUrl && (
          <img
            src={displayProfile.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        )}

        {/* Avatar positioned over banner */}
        <div className="absolute -bottom-8 left-4">
          <div className="relative flex items-start gap-3">
            <div className="relative">
              <Avatar className="w-16 h-16 border-4 border-background">
                <AvatarImage
                  src={displayProfile?.imageUrl}
                  alt={displayProfile?.name}
                />
                <AvatarFallback>
                  {displayProfile?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Status indicator */}
              <div className="absolute -bottom-1 -right-1">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 border-background",
                    getStatusColor(displayProfile?.status as UserStatus)
                  )}
                />
              </div>
            </div>

            {/* Custom Status Bubble */}
            {displayProfile?.presenceStatus &&
              displayProfile.presenceStatus.trim() !== "" &&
              displayProfile.presenceStatus.trim() !== "undefined" &&
              displayProfile.presenceStatus.trim() !== "null" && (
                <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-sm max-w-48 mt-2">
                  <p className="text-sm text-foreground truncate">
                    {displayProfile.presenceStatus}
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Action buttons */}
        {!isCurrentUser && (
          <div className="absolute top-4 right-4 flex gap-2">
            <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="p-4 pt-12">
        {/* User Info */}
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">
              {displayProfile?.globalName || displayProfile?.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              @{displayProfile?.name} | {displayProfile?.pronouns || ""}
            </p>
          </div>

          {/* Bio/About - Always show with fallback */}
          <div>
            <h3 className="text-sm font-semibold mb-1">About Me</h3>
            <p className="text-sm text-muted-foreground">
              {displayProfile?.bio ||
                "This user hasn't written anything about themselves yet."}
            </p>
          </div>

          <Separator />

          {/* Member Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Member since{" "}
                {dayjs(
                  displayProfile?.memberSince || displayProfile?.createdAt
                ).format("MMM DD, YYYY")}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Joined{" "}
                {dayjs(displayProfile?.createdAt).format("MMM DD, YYYY")}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {!isCurrentUser && (
            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                size="sm"
                onClick={createOrNavigateToConversation}
                disabled={creatingConversation}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {creatingConversation ? "Loading..." : "Message"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={startVoiceCall}
                disabled={creatingConversation}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startVideoCall}
                disabled={creatingConversation}
              >
                <Video className="h-4 w-4 mr-2" />
                Video
              </Button>
            </div>
          )}

          {isCurrentUser && (
            <Button className="w-full" size="sm" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // Return based on mode
  if (mode === "dialog") {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild onClick={fetchUserProfile}>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-background border-none">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <DialogContent_Full />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Default popup mode using Popover
  return (
    <>
      {/* Popover for hover preview */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild onClick={fetchUserProfile}>
          {children}
        </PopoverTrigger>
        <PopoverContent
          className="p-0 border shadow-xl w-auto max-w-none"
          side="right"
          align="start"
          sideOffset={8}
        >
          <PopupContent />
        </PopoverContent>
      </Popover>

      {/* Dialog for full view */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <div style={{ display: "none" }} />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-background border-none">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <DialogContent_Full />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
