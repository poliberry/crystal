"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { LiveKitRoom, RoomAudioRenderer, useTracks } from "@livekit/components-react";
import { FloatingCallCard } from "../call-ui";

interface LiveKitContextType {
    join: (room: string, roomName: string, serverName: string, audio: boolean, video: boolean) => void;
    leave: () => void;
    connected: boolean;
    roomName?: string | null;
    serverName?: string | null;
}

const LiveKitContext = createContext<LiveKitContextType | null>(null);

export const useLiveKit = () => {
    const ctx = useContext(LiveKitContext);
    if (!ctx) throw new Error("useLiveKit must be used within a LiveKitProvider");
    return ctx;
};

export const LiveKitProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useUser();
    const { resolvedTheme } = useTheme();

    const [token, setToken] = useState<string>("");
    const [room, setRoom] = useState<string | null>(null);
    const [audio, setAudio] = useState(false);
    const [video, setVideo] = useState(false);

    const [connected, setConnected] = useState(false);
    const [serverName, setServerName] = useState<string | null>(null);
    const [roomName, setRoomName] = useState<string | null>(null);

    const join = async (roomId: string, roomName: string, serverName: string, audio: boolean, video: boolean) => {
        if (!user) return;

        let name = user.username ?? "Unknown";
        if (user.firstName || user.lastName) {
            name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
        }

        try {
            const res = await fetch(`/api/livekit?room=${roomId}&username=${name}&avatar=${user.imageUrl}`);
            const data = await res.json();
            setToken(data.token);
            setRoom(roomId);
            setRoomName(roomName);
            setServerName(serverName);
            setAudio(audio);
            setVideo(video);
            setConnected(true);
            await fetch('/api/socket/room', {
                method: "POST",
            });
        } catch (err) {
            console.error("Failed to join LiveKit room", err);
        }
    };

    const leave = async () => {
        await fetch('/api/socket/room', {
            method: "POST",
        });
        setConnected(false);
        setRoom(null);
        setToken("");
        setAudio(false);
        setVideo(false);
    };

    return (
        <LiveKitContext.Provider value={{ join, leave, connected, serverName, roomName }}>
            <LiveKitRoom
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                connect={connected}
                video={video}
                audio={audio}
                data-lk-theme={resolvedTheme === "dark" ? "default" : "light"}
            >
                <RoomAudioRenderer />
                {children}
            </LiveKitRoom>
        </LiveKitContext.Provider>
    );
};