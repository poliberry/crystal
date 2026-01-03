"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
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
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useLiveKit } from "./providers/media-room-provider";
import { Card } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/lib/permissions";

interface UserDialogProps {
  children: React.ReactNode;
  profileId: string;
  serverId?: string;
  mode?: "popup" | "dialog";
}

interface UserProfileData {
  _id: string;
  name: string;
  bio?: string | null;
  pronouns?: string | null;
  globalName?: string | null;
  bannerUrl?: string | null;
  imageUrl: string;
  status: string;
  servers?: {
    _id: string;
    name: string;
    role: string;
  }[];
  memberSince?: number;
  mutualServers?: number;
  role?: string;
}

export function UserDialog({
  children,
  profileId,
  serverId,
  mode = "popup",
}: UserDialogProps) {
  const router = useRouter();
  const media = useLiveKit();
  const { user } = useAuthStore();
  const currentProfile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const profile = useQuery(
    api.profiles.getByIdWithServer,
    profileId && user?.userId
      ? serverId
        ? {
            profileId: profileId as any,
            serverId: serverId as any,
            userId: user.userId,
          }
        : { profileId: profileId as any, userId: user.userId }
      : "skip"
  );
  const memberProfile = useQuery(
    api.members.getByServer,
    user?.userId && serverId
      ? { userId: user.userId, serverId: serverId as any }
      : "skip"
  );

  // Get all roles for the server
  const serverRoles =
    useQuery(
      api.roles.getByServerId,
      serverId ? { serverId: serverId as any } : "skip"
    ) || [];

  // Get server data for owner check
  const server = useQuery(
    api.servers.getById,
    serverId ? { serverId: serverId as any } : "skip"
  );

  // Get current user's member record for permission checking
  const currentUserMember = memberProfile?.find(
    (member: any) =>
      member.profileId === currentProfile?._id ||
      member.profile?._id === currentProfile?._id ||
      member.profile?.id === currentProfile?._id
  );

  // Check if current user has MANAGE_ROLES permission
  const hasManageRolesPermission = useMemo(() => {
    if (!serverId || !currentUserMember) return false;

    // Server owner always has permission
    if (server?.profileId === currentProfile?._id) return true;

    // Check if user has ADMIN role
    if (currentUserMember.role === "ADMIN") return true;

    // Check if user has a role with MANAGE_ROLES or ADMINISTRATOR permission
    const roleIds =
      currentUserMember.roleIds ||
      (currentUserMember.roleId ? [currentUserMember.roleId] : []);
    const roles =
      currentUserMember.roles ||
      roleIds
        .map((id: string) => serverRoles.find((r: any) => r._id === id))
        .filter(Boolean);

    for (const role of roles) {
      if (
        role?.permissions?.includes(PERMISSIONS.MANAGE_ROLES) ||
        role?.permissions?.includes(PERMISSIONS.ADMINISTRATOR)
      ) {
        return true;
      }
    }

    return false;
  }, [serverId, currentUserMember, currentProfile, serverRoles, server]);

  const toggleRole = useMutation(api.members.toggleRole);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const loading = profile === undefined;

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

  const getStatusText = (status: string) => {
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

  const isCurrentUser = currentProfile?._id === profileId;
  const displayProfile = profile || null;

  // Find the member from the server members array that matches this profileId
  const currentMember = memberProfile?.find(
    (member: any) =>
      member.profileId === profileId ||
      member.profile?._id === profileId ||
      member.profile?.id === profileId
  );
  const memberRoles = currentMember?.roles || [];

  const createOrNavigateToConversation = async () => {
    if (!currentProfile || !profileId || !user?.userId) return;

    setCreatingConversation(true);
    try {
      const conversation = await createDirectConversation({
        otherProfileId: profileId as any,
        userId: user.userId,
      });

      if (conversation) {
        setIsPopoverOpen(false);
        setIsDialogOpen(false);
        router.push(`/conversations/${conversation._id}`);
      }
    } catch (error) {
      console.error("Failed to create/navigate to conversation:", error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const createDirectConversation = useMutation(api.conversations.createDirect);

  const startVoiceCall = async () => {
    if (!currentProfile || !profileId || !user?.userId) return;

    setCreatingConversation(true);
    try {
      const conversation = await createDirectConversation({
        otherProfileId: profileId as any,
        userId: user.userId,
      });

      if (conversation) {
        const conversationName =
          profile?.globalName || profile?.name || "Voice Call";

        // Send notification to the other user
        if (profile?.userId) {
          try {
            const response = await fetch("/api/notifications/incoming-dm-call", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                subscriberId: profile.userId,
                title: "Incoming Voice Call",
                body: `${currentProfile.globalName || currentProfile.name} is calling you`,
                imageUrl: currentProfile.imageUrl,
                conversationId: conversation._id,
                conversationName: conversationName,
                callerName: currentProfile.globalName || currentProfile.name,
                callerId: currentProfile._id,
                isVideo: false,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error("Failed to send call notification:", response.status, errorData);
            } else {
              const result = await response.json();
              console.log("Call notification sent successfully:", result);
            }
          } catch (notifError) {
            console.error("Failed to send call notification:", notifError);
          }
        } else {
          console.warn("Cannot send call notification: profile.userId is missing", { profile });
        }

        setIsPopoverOpen(false);
        setIsDialogOpen(false);

        // Start the call and navigate
        media.joinConversation(conversation._id, conversationName, true, false);
        router.push(`/conversations/${conversation._id}?audio=true`);
      }
    } catch (error) {
      console.error("Failed to start voice call:", error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const startVideoCall = async () => {
    if (!currentProfile || !profileId || !user?.userId) return;

    setCreatingConversation(true);
    try {
      const conversation = await createDirectConversation({
        otherProfileId: profileId as any,
        userId: user.userId,
      });

      if (conversation) {
        const conversationName =
          profile?.globalName || profile?.name || "Video Call";

        // Send notification to the other user
        if (profile?.userId) {
          try {
            const response = await fetch("/api/notifications/incoming-dm-call", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                subscriberId: profile.userId,
                title: "Incoming Video Call",
                body: `${currentProfile.globalName || currentProfile.name} is calling you`,
                imageUrl: currentProfile.imageUrl,
                conversationId: conversation._id,
                conversationName: conversationName,
                callerName: currentProfile.globalName || currentProfile.name,
                callerId: currentProfile._id,
                isVideo: true,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error("Failed to send call notification:", response.status, errorData);
            } else {
              const result = await response.json();
              console.log("Call notification sent successfully:", result);
            }
          } catch (notifError) {
            console.error("Failed to send call notification:", notifError);
          }
        } else {
          console.warn("Cannot send call notification: profile.userId is missing", { profile });
        }

        setIsPopoverOpen(false);
        setIsDialogOpen(false);

        // Start the call and navigate
        media.joinConversation(conversation._id, conversationName, true, true);
        router.push(`/conversations/${conversation._id}?video=true`);
      }
    } catch (error) {
      console.error("Failed to start video call:", error);
    } finally {
      setCreatingConversation(false);
    }
  };

  // Popup Card Content
  const PopupContent = () => (
    <Card className="w-auto min-w-80 max-w-80 p-0 rounded-none overflow-hidden">
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
                <Avatar className="w-20 h-20 border-[5px] after:border-none border-card rounded-none">
                  <AvatarImage
                    src={displayProfile?.imageUrl}
                    alt={displayProfile?.name}
                    className="rounded-none"
                  />
                  <AvatarFallback className="rounded-none">
                    {displayProfile?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0">
                  <div
                    className={cn(
                      "w-6 h-6 border-[5px] border-card",
                      getStatusColor(displayProfile?.status || "OFFLINE")
                    )}
                  />
                </div>
              </div>
              {displayProfile?.presenceStatus && (
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
                @{displayProfile?.name} | {displayProfile?.pronouns || ""}
              </p>
            </div>

            {/* Quick bio */}
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayProfile?.bio ||
                  "This user hasn't written anything about themselves yet."}
              </p>
            </div>

            <div className="flex flex-wrap gap-1 items-center">
              {memberRoles.length > 0 && (
                <>
                  {memberRoles.map((role: any) => (
                    <Badge
                      key={role._id}
                      variant="secondary"
                      className="text-xs"
                      style={
                        role.color
                          ? {
                              backgroundColor: `${role.color}20`,
                              borderColor: role.color,
                              color: role.color,
                            }
                          : undefined
                      }
                    >
                      {role.name}
                    </Badge>
                  ))}
                </>
              )}
              {hasManageRolesPermission && serverId && currentMember && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    onValueChange={async (roleId) => {
                      try {
                        await toggleRole({
                          memberId: currentMember._id,
                          roleId: roleId as any,
                          userId: user?.userId,
                        });
                      } catch (error) {
                        console.error("Failed to toggle role:", error);
                        alert(
                          error instanceof Error
                            ? error.message
                            : "Failed to toggle role"
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="px-1 py-0 border-dashed">
                      <Plus className="h-4 w-4 p-0" />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start" className="z-[101] border-border border-1">
                      {serverRoles
                        .filter((role: any) => {
                          // Filter out roles already assigned
                          const memberRoleIds =
                            currentMember.roleIds ||
                            (currentMember.roleId
                              ? [currentMember.roleId]
                              : []);
                          return !memberRoleIds.includes(role._id);
                        })
                        .map((role: any) => (
                          <SelectItem key={role._id} value={role._id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: role.color || "#5865F2",
                                }}
                              />
                              <span>{role.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      {serverRoles.filter((role: any) => {
                        const memberRoleIds =
                          currentMember.roleIds ||
                          (currentMember.roleId ? [currentMember.roleId] : []);
                        return !memberRoleIds.includes(role._id);
                      }).length === 0 && (
                        <SelectItem value="" disabled>
                          No roles available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
    </Card>
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
              <Avatar className="w-16 h-16 border-4 border-card rounded-none after:border-none">
                <AvatarImage
                  src={displayProfile?.imageUrl}
                  alt={displayProfile?.name}
                  className="rounded-none"
                />
                <AvatarFallback>
                  {displayProfile?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Status indicator */}
              <div className="absolute -bottom-1 -right-1">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 border-card",
                    getStatusColor(displayProfile?.status || "OFFLINE")
                  )}
                />
              </div>
            </div>

            {/* Custom Status Bubble */}
            {displayProfile?.presenceStatus && (
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
                Joined {dayjs(displayProfile?.createdAt).format("MMM DD, YYYY")}
              </span>
            </div>
          </div>

          {/* Server Roles */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Roles</h3>
            <div className="flex flex-wrap gap-1 items-center">
              {memberRoles.length > 0 && (
                <>
                  {memberRoles.map((role: any) => (
                    <Badge
                      key={role._id}
                      variant="secondary"
                      className="text-xs"
                      style={
                        role.color
                          ? {
                              backgroundColor: `${role.color}20`,
                              borderColor: role.color,
                              color: role.color,
                            }
                          : undefined
                      }
                    >
                      {role.name}
                    </Badge>
                  ))}
                </>
              )}
              {hasManageRolesPermission && serverId && currentMember && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    onValueChange={async (roleId) => {
                      try {
                        await toggleRole({
                          memberId: currentMember._id,
                          roleId: roleId as any,
                          userId: user?.userId,
                        });
                      } catch (error) {
                        console.error("Failed to toggle role:", error);
                        alert(
                          error instanceof Error
                            ? error.message
                            : "Failed to toggle role"
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="h-6 w-6 p-0 border-dashed">
                      <SelectValue>
                        <Plus className="h-4 w-4" />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-[101]">
                      {serverRoles
                        .filter((role: any) => {
                          // Filter out roles already assigned
                          const memberRoleIds =
                            currentMember.roleIds ||
                            (currentMember.roleId
                              ? [currentMember.roleId]
                              : []);
                          return !memberRoleIds.includes(role._id);
                        })
                        .map((role: any) => (
                          <SelectItem key={role._id} value={role._id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: role.color || "#5865F2",
                                }}
                              />
                              <span>{role.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      {serverRoles.filter((role: any) => {
                        const memberRoleIds =
                          currentMember.roleIds ||
                          (currentMember.roleId ? [currentMember.roleId] : []);
                        return !memberRoleIds.includes(role._id);
                      }).length === 0 && (
                        <SelectItem value="" disabled>
                          No roles available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {memberRoles.length === 0 && !hasManageRolesPermission && (
                <p className="text-xs text-muted-foreground">
                  No roles assigned
                </p>
              )}
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

  // Handler to open dialog/popover (profile is already fetched via useQuery)
  const handleOpen = () => {
    if (mode === "dialog") {
      setIsDialogOpen(true);
    } else {
      setIsPopoverOpen(true);
    }
  };

  // Return based on mode
  if (mode === "dialog") {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger className="w-full" onClick={handleOpen}>
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
        <PopoverTrigger className="w-full" onClick={handleOpen}>
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
        <DialogTrigger className="hidden">
          <div />
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
