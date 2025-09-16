"use client";

import { User } from "@clerk/nextjs/server";
import { useLiveKit } from "../providers/media-room-provider";
import { FloatingCallCard } from "../call-ui";
import { Card } from "../ui/card";
import { Avatar, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { ChevronRight, CogIcon, Mic, MicOff, Phone } from "lucide-react";
import { CustomCssAction } from "./custom-css-editor";
import { ModeToggle } from "../mode-toggle";
import { Input } from "../ui/input";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  useLiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { getLiveKitRoom } from "@/lib/LiveKitRoomManager";
import { Badge } from "../ui/badge";
import React, { useEffect, useRef, useState } from "react";
import { Profile, UserStatus } from "@/lib/types";
import { useStatusInitializer } from "@/hooks/use-status-initializer";
import { useStatus } from "@/components/providers/status-provider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useModal } from "@/hooks/use-modal-store";
import { usePusher } from "../providers/pusher-provider";
import { useDND } from "../providers/dnd-provider";
import { ActionTooltip } from "../action-tooltip";
import { UserDialog } from "../user-dialog";

export const UserCard = ({ profile }: { profile: Profile }) => {
  const { user } = useUser();
  const { onOpen } = useModal();
  const { socket } = usePusher();
  const { localParticipant } = useLocalParticipant();
  const livekit = useLiveKit();
  const { isDND, updateStatus } = useDND();

  // Use the enhanced status system
  const { status, customStatus, setStatus, loading } = useStatus();

  const [presence, setPresence] = useState<
    "ONLINE" | "IDLE" | "DND" | "OFFLINE"
  >(() => {
    if (status === UserStatus.INVISIBLE) return "OFFLINE";
    return (status as "ONLINE" | "IDLE" | "DND" | "OFFLINE") || "ONLINE";
  });
  const idleTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showCallUi, setShowCallUi] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const remoteParticipants = useRemoteParticipants();

  const allParticipants = [localParticipant, ...remoteParticipants];

  const setOnline = async (statusUpdate: {
    presence: "ONLINE" | "IDLE" | "DND" | "OFFLINE";
  }) => {
    setPresence(statusUpdate.presence);
    if (idleTimeout.current) clearTimeout(idleTimeout.current);

    try {
      // Use the new presence system for better persistence
      await setStatus(statusUpdate.presence as UserStatus);
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  useEffect(() => {
    // Initialize status mapping from the status provider
    if (status) {
      const mappedStatus =
        status === UserStatus.INVISIBLE
          ? "OFFLINE"
          : (status as "ONLINE" | "IDLE" | "DND" | "OFFLINE");
      setPresence(mappedStatus);
    }

    const handleUnload = () => {
      const blob = new Blob([JSON.stringify({ status: "OFFLINE" })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/user/status", blob);
    };

    socket?.on("rtc:calls:start", (data: any) => {
      console.log("[RTC_CALL_START]", data);
      if (data.memberId === profile?.id) {
        onOpen("dmCall", {
          callData: {
            caller: {
              name: data.caller.name,
              avatar: data.caller.avatar,
            },
            memberId: data.memberId,
          },
        });
      }
    });

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [status]);

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
    OFFLINE: { color: "bg-gray-500", text: "Offline" },
  };

  return (
    <Card
      className={`md:block max-h-auto absolute top-10 right-0 min-w-[280px] max-w-full border-none flex flex-col rounded-none items-start`}
    >
      <div
        className={cn(
          "flex items-center gap-x-3 w-full pl-2",
          livekit.connected ? "justify-start" : "justify-between"
        )}
      >
        {livekit.connected && (
          <>
            <Button
              variant="primary"
              size="sm"
              className={cn(
                "h-8 min-w-0 flex-shrink-0 hover:bg-green-600 px-2",
                showCallUi
                  ? "bg-green-800 hover:bg-green-600"
                  : "bg-transparent border border-1 border-green-800"
              )}
              onClick={() => setShowCallUi(!showCallUi)}
            >
              <div className="flex items-center gap-1 max-w-full overflow-hidden">
                {/* Local user avatar */}
                {allParticipants.slice(0, 3).map((p, index) => {
                  const metadata = safeParseMetadata(p.metadata);
                  return (
                    <AvatarCard
                      key={p.identity || index}
                      name={p?.identity}
                      image={metadata?.avatar}
                      isSpeaking={p.isSpeaking}
                    />
                  );
                })}
                {allParticipants.length > 3 && (
                  <span className="text-xs text-green-400 ml-1">
                    +{allParticipants.length - 3}
                  </span>
                )}
              </div>
              <Phone className="h-4 w-4 text-green-400 ml-1 flex-shrink-0" />
            </Button>
            <Separator orientation="vertical" className="h-6 flex-shrink-0" />
          </>
        )}
        <div
          className={cn(
            "flex items-center gap-x-3 py-[5px]",
            livekit.connected ? "flex-1 min-w-0" : ""
          )}
        >
          <ContextMenu>
            <ContextMenuTrigger>
              <UserDialog profileId={profile.id}>
                <div className="relative cursor-pointer group">
                  <Avatar className="w-8 h-8 rounded-full group-hover:opacity-80 transition-opacity">
                    <AvatarImage
                      src={user?.imageUrl}
                      alt={user?.username || ""}
                    />
                  </Avatar>
                  <Badge
                    className={`absolute bottom-0 right-0 ${presenceMap[presence].color} text-white p-[5px] text-xs border-2 border-background rounded-full`}
                  />
                </div>
              </UserDialog>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem
                onClick={() => setOnline({ presence: "ONLINE" })}
              >
                <div className="flex items-center gap-x-2">
                  <Badge
                    className={`${presenceMap["ONLINE"].color} text-white p-[5px] text-xs border-2 border-background rounded-full`}
                  />
                  Online
                </div>
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setOnline({ presence: "IDLE" })}>
                <div className="flex items-center gap-x-2">
                  <Badge
                    className={`${presenceMap["IDLE"].color} text-white p-[5px] text-xs border-2 border-background rounded-full`}
                  />
                  Idle
                </div>
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setOnline({ presence: "DND" })}>
                <div className="flex items-center gap-x-2">
                  <Badge
                    className={`${presenceMap["DND"].color} text-white p-[5px] text-xs border-2 border-background rounded-full`}
                  />
                  Do Not Disturb
                </div>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onOpen("setStatus")}>
                Set Custom Status
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold truncate">
              {profile.name}
            </span>
            <div className="text-[10.5px] text-muted-foreground truncate">
              {customStatus || presenceMap[presence].text}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-2 pr-1 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={() => onOpen("userSettings")}
            className="w-8 h-8"
            size="icon"
          >
            <CogIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {livekit.connected && showCallUi && <FloatingCallCard />}
    </Card>
  );
};

function AvatarCard({
  name,
  image,
  isSpeaking,
}: {
  name: string;
  image?: string;
  isSpeaking: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-5 h-5 rounded-full overflow-hidden border-2 flex-shrink-0",
        isSpeaking ? "border-green-400" : "border-zinc-700"
      )}
    >
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-xs">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
