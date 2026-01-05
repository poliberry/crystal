"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { RoomOptions, VideoPresets } from "livekit-client";
import { FloatingCallCard } from "../call-ui";

// Detect if running in Tauri
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// Patch LiveKit's browser detection for WebKit/Tauri compatibility
if (typeof window !== "undefined" && isTauri) {
  // Ensure WebRTC APIs are available - try webkit prefix
  if (!window.RTCPeerConnection) {
    if ((window as any).webkitRTCPeerConnection) {
      (window as any).RTCPeerConnection = (window as any).webkitRTCPeerConnection;
    }
    // Also try to ensure RTCSessionDescription and RTCIceCandidate
    if (!window.RTCSessionDescription && (window as any).webkitRTCSessionDescription) {
      (window as any).RTCSessionDescription = (window as any).webkitRTCSessionDescription;
    }
    if (!window.RTCIceCandidate && (window as any).webkitRTCIceCandidate) {
      (window as any).RTCIceCandidate = (window as any).webkitRTCIceCandidate;
    }
  }
  
  // Patch window.onerror to catch and suppress LiveKit browser detection errors
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const messageStr = message?.toString() || "";
    if (messageStr.includes("LiveKit doesn't seem to be supported") || 
        messageStr.includes("webRTC") ||
        messageStr.includes("WebRTC")) {
      console.warn("LiveKit browser detection warning (suppressed for Tauri/WebKit):", message);
      return true; // Suppress the error
    }
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Also patch unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.toString() || "";
    if (reason.includes("LiveKit doesn't seem to be supported") || 
        reason.includes("webRTC") ||
        reason.includes("WebRTC")) {
      console.warn("LiveKit browser detection warning (suppressed for Tauri/WebKit):", event.reason);
      event.preventDefault(); // Suppress the error
    }
  });
}

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

  const { user } = useAuthStore();
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const getToken = useAction(api.livekit.getToken);

  // Ensure WebRTC APIs are available (especially for WebKit/Tauri)
  useEffect(() => {
    if (isTauri && typeof window !== "undefined") {
      // Polyfill or ensure WebRTC APIs are available
      if (!window.RTCPeerConnection) {
        console.warn("RTCPeerConnection not available, attempting to enable WebRTC support...");
        // Try to access getUserMedia to ensure WebRTC is enabled
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // WebRTC should be available if getUserMedia exists
          console.log("getUserMedia available, WebRTC should be supported");
        } else {
          console.error("WebRTC APIs not available in this environment");
        }
      }
    }
  }, []);

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

    if (!profile || !user) return;

    let name = profile.globalName ?? profile.name;

    try {
      call_connecting.loop = true;
      call_connecting.play();
      
      // Use Convex action to get token
      const data = await getToken({
        room: roomId,
        username: name,
        avatar: profile.imageUrl,
        userId: user.userId,
      });

      setToken(data.token);
      setRoom(roomId);
      setRoomName(roomName);
      setServerName(serverName);
      setRoomId(roomId);
      setServerId(serverId);
      setConversationId(conversationId || null);
      setRoomType(roomType);
      setAudio(audio);
      setVideo(video);
      setConnected(true);
      
      // Real-time updates handled by Convex
      call_connecting.pause();
      call_connected.play();
      call_connecting.pause();
      call_connected.play();
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
    // Real-time updates handled by Convex
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

  // Configure RoomOptions for WebKit/Tauri compatibility
  const roomOptions: RoomOptions = isTauri
    ? {
        // WebKit-specific options for better compatibility
        adaptiveStream: false, // Disable adaptive stream for WebKit
        dynacast: false, // Disable dynacast for WebKit
        // Use VP8 codec which has better WebKit support
        videoCodec: "vp8",
        // Disable publishDefaults to avoid WebRTC detection issues
        publishDefaults: {
          videoCodec: "vp8",
          videoEncoding: {
            maxBitrate: 3000000,
            maxFramerate: 30,
          },
        },
        // Enable E2EE if needed, but keep it simple for WebKit
        e2ee: false,
      }
    : {
        // Default options for regular browsers
        adaptiveStream: true,
        dynacast: true,
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
        options={roomOptions}
        data-lk-theme={resolvedTheme === "dark" ? "default" : "light"}
        onError={(error) => {
          // Handle WebRTC detection errors gracefully for WebKit/Tauri
          if (error.message?.includes("doesn't seem to be supported") || 
              error.message?.includes("webRTC") ||
              error.message?.includes("WebRTC")) {
            console.warn("LiveKit WebRTC detection warning (may be false positive in WebKit):", error);
            // Don't throw - allow connection to proceed as WebRTC might still work
            return;
          }
          console.error("LiveKit error:", error);
        }}
      >
        <RoomAudioRenderer />
        {children}
      </LiveKitRoom>
    </LiveKitContext.Provider>
  );
};
