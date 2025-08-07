"use client"

import { User } from "@clerk/nextjs/server";
import { useLiveKit } from "../providers/media-room-provider";
import { FloatingCallCard } from "../call-ui";
import { Card } from "../ui/card";
import { Avatar, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { ChevronRight, CogIcon, Mic, MicOff } from "lucide-react";
import { CustomCssAction } from "./custom-css-editor";
import { ModeToggle } from "../mode-toggle";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useLiveKitRoom, useLocalParticipant } from "@livekit/components-react";
import { getLiveKitRoom } from "@/lib/LiveKitRoomManager";
import { Badge } from "../ui/badge";
import React, { useEffect, useRef, useState } from "react";
import { Profile, UserStatus } from "@prisma/client";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const UserCard = ({ profile }: { profile: Profile }) => {
    const { user } = useUser();
    const { localParticipant } = useLocalParticipant();
    const livekit = useLiveKit();
    const [presence, setPresence] = useState<"ONLINE" | "IDLE" | "DND">("ONLINE");
    const idleTimeout = useRef<NodeJS.Timeout | null>(null);

    const setOnline = async (status: { presence: "ONLINE" | "IDLE" | "DND" }) => {
        setPresence(status.presence);
        if (idleTimeout.current) clearTimeout(idleTimeout.current);
        // Call API to update status
        try {
            await fetch("/api/socket/user-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: status.presence }),
            });
        } catch (error) {
            // Optionally handle error
            console.error("Failed to update user status:", error);
        }
    };

    useEffect(() => {
        const setStatus = async () => {
            const res = await fetch(`/api/user?userId=${profile.userId}`);
            const profileData = await res.json();
            setOnline({ presence: profileData?.prevStatus as "ONLINE" | "IDLE" | "DND" || "ONLINE" }); // Set to online on mount
        };

        setStatus();

        const handleUnload = () => {
            const blob = new Blob(
                [JSON.stringify({ status: "OFFLINE" })],
                { type: "application/json" }
            );
            navigator.sendBeacon("/api/socket/user-status", blob);
        };

        window.addEventListener("beforeunload", handleUnload);

        return () => {
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, []);

    // Map presence to badge color and text
    const presenceMap = {
        ONLINE: { color: "bg-green-500", text: "Online" },
        IDLE: { color: "bg-yellow-500", text: "Idle" },
        DND: { color: "bg-red-500", text: "Do Not Disturb" },
    };

    return (
        <Card className={`md:block h-14 w-full flex flex-col items-start`}>
            {
                livekit.connected && (
                    <FloatingCallCard />
                )
            }
            <div className="flex items-center justify-between gap-x-3 w-full p-2">
                <div className="flex items-center gap-x-3">
                    <div className="relative">
                        <Avatar className="w-10 h-10 rounded-full">
                            <AvatarImage
                                src={user?.imageUrl}
                                alt={user?.username || ""}
                            />
                        </Avatar>
                        <Badge
                            className={`absolute bottom-0 right-0 ${presenceMap[presence].color} text-white p-1 text-xs rounded-full`}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold">{profile.name}</span>
                        <span className="text-[12px] text-muted-foreground group relative overflow-hidden w-28 h-5 flex items-center">
                            <span className="absolute left-0 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
                                {presenceMap[presence].text}
                            </span>
                            <span className="absolute left-0 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
                                {user?.username}
                            </span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-x-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <CogIcon className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <CustomCssAction />
                            <ModeToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <DropdownMenuItem className="w-full justify-between">
                                        Set Status
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </DropdownMenuItem>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="right" sideOffset={10}>
                                    <DropdownMenuItem onClick={() => setOnline({ presence: "ONLINE" })}>
                                        Online
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setOnline({ presence: "IDLE" })}>
                                        Idle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setOnline({ presence: "DND" })}>
                                        Do Not Disturb
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Link href="/account">
                                <DropdownMenuItem className="w-full justify-start">
                                    Account
                                </DropdownMenuItem>
                            </Link>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </Card>
    );
}