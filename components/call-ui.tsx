"use client";

import {
    useTracks,
    useLocalParticipant,
    useRoomContext,
    useRemoteParticipants,
} from "@livekit/components-react";
import {
    Track,
    Participant,
    Room,
} from "livekit-client";
import { useEffect, useState } from "react";
import { Mic, Video, MonitorUp, Signal, PhoneOff, Phone, VideoOff, MonitorDown, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { disconnectLiveKitRoom } from "@/lib/LiveKitRoomManager";
import { useLiveKit } from "./providers/media-room-provider";

// Floating UI component to persist across tab views
export function FloatingCallCard() {
    const room = useRoomContext();
    const liveKit = useLiveKit();
    const { localParticipant } = useLocalParticipant();
    const remoteParticipants = useRemoteParticipants();
    const [isSharingScreen, setSharingScreen] = useState(false);
    const { user } = useUser();
    const [isSpeaking, setIsSpeaking] = useState(localParticipant.isSpeaking);
    const allParticipants = [localParticipant, ...remoteParticipants];

    // Listen for isSpeaking changes
    useEffect(() => {
        const handleSpeakingChanged = () => {
            setIsSpeaking(localParticipant.isSpeaking);
        };
        localParticipant.on("isSpeakingChanged", handleSpeakingChanged);
        return () => {
            localParticipant.off("isSpeakingChanged", handleSpeakingChanged);
        };
    }, [localParticipant]);

    const toggleScreenShare = async () => {
        room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled);
    };

    function safeParseMetadata(raw?: string): { avatar?: string } | null {
        try {
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    const disconnectCall = async () => {
        const call_connect = new Audio("/sounds/call-disconnect.ogg");
        call_connect.play();
        liveKit.leave();
    }

    return (
        <div className="z-50 w-full bg-white dark:bg-background text-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex flex-row border-b items-center p-2 justify-between">
                <div className="flex flex-col items-start gap-1">
                    <div className="text-sm font-medium text-foreground">
                        Voice Connected
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                        {liveKit.roomName || "Unknown Room"} / {liveKit.serverName || "Unknown Server"}
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={disconnectCall}>
                    <Phone className={cn("h-5 w-5 text-red-400 rotate-[135deg]")} />
                </Button>
            </div>
            <div className="flex flex-wrap gap-2 px-2 pt-2">
                {/* Local user avatar */}
                {
                    allParticipants.map((p) => {
                        const metadata = safeParseMetadata(p.metadata);
                        return (
                            <AvatarCard
                                name={p?.identity}
                                image={metadata?.avatar}
                                isSpeaking={p.isSpeaking}
                            />
                        )
                    })
                }
            </div>
            <div className="flex gap-2 p-2 justify-center">
                {localParticipant.isMicrophoneEnabled ? (
                    <Button
                        variant="secondary"
                        className="w-full p-1"
                        onClick={() => {
                            const mute = new Audio("/sounds/mute.ogg");
                            mute.play();
                            localParticipant.setMicrophoneEnabled(
                                !localParticipant.isMicrophoneEnabled
                            )
                        }
                        }
                    >
                        <Mic className="h-5 w-5" />
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        className="w-full bg-red-500 hover:bg-red-700 p-1"
                        onClick={() => {
                            const unmute = new Audio("/sounds/unmute.ogg");
                            unmute.play();
                            localParticipant.setMicrophoneEnabled(
                                !localParticipant.isMicrophoneEnabled
                            )
                        }
                        }
                    >
                        <MicOff className="h-5 w-5" />
                    </Button>
                )}
                {localParticipant.isCameraEnabled ? (
                    <Button
                        variant="primary"
                        className="w-full bg-green-500 hover:bg-green-700 p-1"
                        onClick={() =>
                            localParticipant.setCameraEnabled(
                                !localParticipant.isCameraEnabled
                            )
                        }
                    >
                        <Video className="h-5 w-5" />
                    </Button>
                ) : (
                    <Button
                        variant="secondary"
                        className="w-full p-1"
                        onClick={() =>
                            localParticipant.setCameraEnabled(
                                !localParticipant.isCameraEnabled
                            )
                        }
                    >
                        <VideoOff className="h-5 w-5" />
                    </Button>
                )}
                {localParticipant.isScreenShareEnabled ? (
                    <Button variant="primary" className="w-full bg-red-500 hover:bg-red-700 p-1" onClick={() => {
                        const stopShare = new Audio("/sounds/sc-end.ogg");
                        stopShare.play();
                        toggleScreenShare();
                    }}>
                        <MonitorDown className="h-5 w-5" />
                    </Button>
                ) : (
                    <Button variant="secondary" className="w-full" onClick={() => {
                        const startShare = new Audio("/sounds/sc-start.ogg");
                        startShare.play();
                        toggleScreenShare();
                    }}>
                        <MonitorUp className="h-5 w-5" />
                    </Button>
                )}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full p-1">
                            <Signal className="h-5 w-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-800 text-white">
                        <p>Stats and settings coming soon.</p>
                    </DialogContent>
                </Dialog>

            </div>
        </div >
    );
}

function AvatarCard({ name, image, isSpeaking }: { name: string; image?: string; isSpeaking: boolean }) {
    return (
        <div
            className={cn(
                "relative w-8 h-8 rounded-full overflow-hidden border-2",
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
