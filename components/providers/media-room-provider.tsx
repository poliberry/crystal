"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { FloatingCallCard } from "../call-ui";

interface LiveKitContextType {
  join: (
    room: string,
    roomName: string,
    serverName: string,
    serverId: string,
    roomType: "conversation" | "channel",
    audio: boolean,
    video: boolean,
    conversationId?: string
  ) => void;
  joinConversation: (
    conversationId: string,
    conversationName: string,
    audio: boolean,
    video: boolean
  ) => void;
  leave: () => void;
  connected: boolean;
  roomName?: string | null;
  serverName?: string | null;
  roomType?: "conversation" | "channel";
  roomId?: string | null;
  serverId?: string | null;
  conversationId?: string | null;
}

const LiveKitContext = createContext<LiveKitContextType | null>(null);

export const useLiveKit = () => {
  const ctx = useContext(LiveKitContext);
  if (!ctx) throw new Error("useLiveKit must be used within a LiveKitProvider");
  return ctx;
};

export const LiveKitProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { resolvedTheme } = useTheme();

  const [token, setToken] = useState<string>("");
  const [room, setRoom] = useState<string | null>(null);
  const [audio, setAudio] = useState(false);
  const [video, setVideo] = useState(false);

  const [connected, setConnected] = useState(false);
  const [serverName, setServerName] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<"conversation" | "channel">(
    "channel"
  );
  const [roomId, setRoomId] = useState<string | null>(null);
  const [serverId, setServerId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const join = async (
    roomId: string,
    roomName: string,
    serverName: string,
    serverId: string,
    roomType: "conversation" | "channel",
    audio: boolean,
    video: boolean,
    conversationId?: string
  ) => {
    const call_connecting = new Audio("/sounds/call-connecting.ogg");
    const call_connected = new Audio("/sounds/call-connect.ogg");

    const user = await fetch("/api/profile").then((res) => res.json());

    if (!user) return;

    let name = user.globalName ?? user.name;

    try {
      call_connecting.loop = true;
      call_connecting.play();
      const res = await fetch(
        `/api/livekit?room=${roomId}&username=${name}&avatar=${user.imageUrl}`
      );
     const data = await res.json();

      await Promise.all([
      setToken(data.token),
      setRoom(roomId),
      setRoomName(roomName),
      setServerName(serverName),
      setRoomId(roomId),
      setServerId(serverId),
      setConversationId(conversationId || null),
      setRoomType(roomType),
      setAudio(audio),
      setVideo(video),
      setConnected(true),
      await fetch("/api/socket/room", {
        method: "POST",
      }),
      await fetch('/api/socket/room/connect', {
        method: "POST",
        body: JSON.stringify({
          roomId: roomName,
          user: user.id
        }),
      })
    ]).then(() => {
      call_connecting.pause();
      call_connected.play();
    });
    } catch (err) {
      console.error("Failed to join LiveKit room", err);
    }
  };

  const joinConversation = async (
    conversationId: string,
    conversationName: string,
    audio: boolean,
    video: boolean
  ) => {
    // Use conversation ID as the room ID for calls
    await join(
      `conversation-${conversationId}`,
      conversationName,
      "Direct Messages",
      "dm",
      "conversation",
      audio,
      video,
      conversationId
    );
  };

  const leave = async () => {
    await fetch("/api/socket/room", {
      method: "POST",
    });
    setConnected(false);
    setRoom(null);
    setToken("");
    setRoomName(null);
    setServerName(null);
    setRoomType("channel");
    setRoomId(null);
    setServerId(null);
    setConversationId(null);
    setAudio(false);
    setVideo(false);
  };

  return (
    <LiveKitContext.Provider
      value={{ 
        join, 
        joinConversation, 
        leave, 
        connected, 
        serverName, 
        roomName, 
        roomType, 
        roomId, 
        serverId, 
        conversationId 
      }}
    >
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
