"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLiveKit } from "../providers/media-room-provider";
import { FloatingCallCard } from "../call-ui";
import { Separator } from "@/components/ui/separator";
import { Card } from "../ui/card";
import { Avatar, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { ChevronRight, CogIcon, Phone } from "lucide-react";
import { ModeToggle } from "../mode-toggle";
import { Badge } from "../ui/badge";
import React, { useEffect, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { cn } from "@/lib/utils";
import { useModal } from "@/hooks/use-modal-store";
import { useAuthStore } from "@/lib/auth-store";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { UserDialog } from "../user-dialog";

export const UserCard = () => {
  const { onOpen } = useModal();
  const { localParticipant } = useLocalParticipant();
  const livekit = useLiveKit();
  const { user } = useAuthStore();

  // Fetch current user's profile from Convex (auto-updates in real-time)
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const updateStatusMutation = useMutation(api.profiles.updateStatus);
  const remoteParticipants = useRemoteParticipants();

  const allParticipants = [localParticipant, ...remoteParticipants];

  // Get current status from profile (auto-updates via Convex subscription)
  const presence =
    (profile?.status as "ONLINE" | "IDLE" | "DND" | "OFFLINE" | "INVISIBLE") ||
    "ONLINE";

  const setOnline = async (
    status: "ONLINE" | "IDLE" | "DND" | "OFFLINE" | "INVISIBLE"
  ) => {
    if (!user?.userId) return;

    try {
      await updateStatusMutation({
        status: status,
        userId: user.userId,
      });

      // Update localStorage for immediate access
      if (typeof window !== "undefined") {
        localStorage.setItem("user-presence-status", status);
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  useEffect(() => {
    const handleLoad = async () => {
      if (!user?.userId || !profile) return;

      try {
        if (
          profile.status === "OFFLINE" &&
          profile.prevStatus &&
          profile.prevStatus !== "OFFLINE"
        ) {
          await updateStatusMutation({
            status: profile.prevStatus,
            userId: user.userId,
          });
        } else if (
          profile.status === "OFFLINE" &&
          (!profile.prevStatus || profile.prevStatus === "OFFLINE")
        ) {
          await updateStatusMutation({
            status: "ONLINE",
            userId: user.userId,
          });
        } else if (profile.status !== 'OFFLINE' && profile.prevStatus === 'OFFLINE') {
          await updateStatusMutation({
            status: profile.status,
            userId: user.userId,
          });
        } else if (profile.status) {
          await updateStatusMutation({
            status: profile.status,
            userId: user.userId,
          });
        }
      } catch (error) {
        console.error("Failed to set offline status:", error);
      }
    };
    const handleUnload = async () => {
      if (!user?.userId) return;

      try {
        await updateStatusMutation({
          status: "OFFLINE",
          userId: user.userId,
        });
      } catch (error) {
        console.error("Failed to set offline status:", error);
      }
    };

    handleLoad();
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user?.userId, updateStatusMutation]);

  function safeParseMetadata(raw?: string): { avatar?: string } | null {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // Map presence to badge color and text
  const presenceMap = {
    ONLINE: { color: "bg-green-500", text: "Online" },
    IDLE: { color: "bg-yellow-500", text: "Idle" },
    DND: { color: "bg-red-500", text: "Do Not Disturb" },
    INVISIBLE: { color: "bg-gray-500", text: "Invisible" },
    OFFLINE: { color: "bg-gray-500", text: "Offline" },
  };

  // Show loading state if profile is not yet loaded
  if (profile === undefined) {
    return (
      <Card className="flex flex-col rounded-none bg-transparent items-start p-0 w-fit h-fit">
        <div className="flex items-center gap-x-3 w-fit pl-2">
          <div className="w-8 h-8 rounded-none bg-muted animate-pulse" />
          <div className="flex flex-col min-w-0">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <div className="h-3 w-16 bg-muted animate-pulse rounded mt-1" />
          </div>
        </div>
      </Card>
    );
  }

  // Show nothing if no profile found
  if (!profile) {
    return null;
  }

  return (
    <Card
      className={`flex flex-col rounded-none bg-transparent items-start p-0 w-fit h-fit`}
    >
      <div
        className={cn(
          "flex items-center gap-x-3 w-fit pl-2",
          livekit.connected ? "justify-start" : "justify-between"
        )}
      >
        {livekit.connected && (
          <>
            <FloatingCallCard />
            <Separator orientation="vertical" className="h-6 flex-shrink-0" />
          </>
        )}
        <div
          className={cn(
            "flex flex-row items-center gap-3 min-w-0",
            livekit.connected ? "flex-1" : ""
          )}
        >
          <UserDialog profileId={profile?._id}>
            <div className="flex gap-2 items-center min-w-0 flex-1">
              <ContextMenu>
                <ContextMenuTrigger className="rounded-none flex-shrink-0">
                  <div className="relative cursor-pointer group">
                    <Avatar className="w-8 h-8 rounded-none group-hover:opacity-80 transition-opacity flex-shrink-0">
                      <AvatarImage
                        src={profile?.imageUrl}
                        alt={profile?.name || profile?.globalName || ""}
                        className="rounded-none"
                      />
                    </Avatar>
                    <Badge
                      className={`absolute -bottom-0.5 -right-0.5 ${presenceMap[presence].color} text-white p-[5px] h-3 w-3 text-xs border-2 border-background rounded-none`}
                    />
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => setOnline("ONLINE")}>
                    <div className="flex items-center gap-x-2">
                      <Badge
                        className={`${presenceMap["ONLINE"].color} text-white p-[5px] h-3 w-3 text-xs border-2 border-background rounded-full`}
                      />
                      Online
                    </div>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setOnline("IDLE")}>
                    <div className="flex items-center gap-x-2">
                      <Badge
                        className={`${presenceMap["IDLE"].color} text-white p-[5px] h-3 w-3 text-xs border-2 border-background rounded-full`}
                      />
                      Idle
                    </div>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setOnline("DND")}>
                    <div className="flex items-center gap-x-2">
                      <Badge
                        className={`${presenceMap["DND"].color} text-white p-[5px] h-3 w-3 text-xs border-2 border-background rounded-full`}
                      />
                      Do Not Disturb
                    </div>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setOnline("INVISIBLE")}>
                    <div className="flex items-center gap-x-2">
                      <Badge
                        className={`${presenceMap["INVISIBLE"].color} text-white p-[5px] h-3 w-3 text-xs border-2 border-background rounded-full`}
                      />
                      Invisible
                    </div>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onOpen("setStatus")}>
                    Set Custom Status
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-semibold truncate">
                  {profile.globalName || profile.name}
                </span>
                <div className="text-[10.5px] text-muted-foreground truncate">
                  {profile?.presenceStatus ? profile.presenceStatus : presenceMap[presence]?.text || "Offline"}
                </div>
              </div>
            </div>
          </UserDialog>
        </div>

        <div className="pl-5 flex items-center gap-x-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className="cursor-pointer">
                <CogIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => onOpen("userSettings")}
                className="w-full justify-start"
              >
                Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};