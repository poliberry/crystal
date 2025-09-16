"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher";
import { UserStatus } from "@prisma/client";
import { useModal } from "@/hooks/use-modal-store";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useDND } from "@/components/providers/dnd-provider";

type PusherContextType = {
  socket: any | null; // Compatibility layer for Socket.IO API
  pusher: typeof pusherClient | null;
  isConnected: boolean;
};

const PusherContext = createContext<PusherContextType>({
  socket: null,
  pusher: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(PusherContext);
};

export const usePusher = () => {
  return useContext(PusherContext);
};

export const PusherProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const { onOpen } = useModal();
  const params = useParams();
  const { user } = useUser();
  const { checkCallPermission } = useDND();

  // Create a socket-like interface for compatibility
  const createSocketInterface = () => ({
    emit: (event: string, data: any) => {
      console.log(`[PUSHER_EMIT] ${event}`, data);
      
      // Handle different event types
      switch (event) {
        case "call:start":
          // Emit to global presence channel for call notifications
          fetch("/api/pusher/call-start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          break;
          
        case "call:ended":
          // Emit call ended event
          fetch("/api/pusher/call-end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          break;
          
        case "rtc:calls:start":
          // Handle RTC call start event
          fetch("/api/pusher/call-start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          break;
          
        default:
          console.warn(`[PUSHER_EMIT] Unhandled event: ${event}`);
      }
    },
    on: (event: string, callback: Function) => {
      console.log(`[PUSHER_ON] Listening for ${event}`);
      // Event listeners are handled in the useEffect below
    },
    off: (event: string, callback?: Function) => {
      console.log(`[PUSHER_OFF] Removing listener for ${event}`);
    },
  });

  const socketInterface = createSocketInterface();

  // Fetch current profile ID
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const response = await fetch("/api/profile");
          const profile = await response.json();
          setCurrentProfileId(profile.id);
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    console.log("[PUSHER] Setting up connection...");

    pusherClient.connection.bind("connected", () => {
      console.log("[PUSHER] Connected to Pusher, socket ID:", pusherClient.connection.socket_id);
      setIsConnected(true);
    });

    pusherClient.connection.bind("connecting", () => {
      console.log("[PUSHER] Connecting to Pusher...");
    });

    pusherClient.connection.bind("disconnected", () => {
      console.log("[PUSHER] Disconnected from Pusher");
      setIsConnected(false);
    });

    pusherClient.connection.bind("error", (error: any) => {
      console.error("[PUSHER] Connection error:", error);
      setIsConnected(false);
    });

    pusherClient.connection.bind("failed", () => {
      console.error("[PUSHER] Connection failed");
    });

    // Subscribe to global presence channel for calls
    const globalChannel = pusherClient.subscribe("presence-global");

    globalChannel.bind("call:incoming", async (callData: any) => {
      // Check if user should receive call alerts (not in DND mode)
      const canReceiveCalls = await checkCallPermission();

      // Only show the modal if the user is not the caller, is in the conversation, and not in DND mode
      if (callData.callerId !== currentProfileId &&
          (params?.conversationId === callData.conversationId ||
           callData.participantIds?.includes(currentProfileId)) &&
          canReceiveCalls) {

        onOpen("dmCall", {
          callData: {
            conversationId: callData.conversationId,
            conversationName: callData.conversationName,
            type: callData.type,
            caller: {
              id: callData.callerId,
              name: callData.callerName,
              avatar: callData.callerAvatar,
            },
            memberId: callData.conversationId, // For navigation
          }
        });
      }
    });

    // Also listen for rtc:calls:start for backward compatibility
    globalChannel.bind("rtc:calls:start", async (callData: any) => {
      console.log("[RTC_CALL_START_PUSHER]", callData);
      // Check if user should receive call alerts (not in DND mode)
      const canReceiveCalls = await checkCallPermission();

      if (callData.memberId === currentProfileId && canReceiveCalls) {
        onOpen("dmCall", {
          callData: {
            caller: {
              name: callData.caller.name,
              avatar: callData.caller.avatar,
            },
            memberId: callData.memberId,
          },
        });
      }
    });

    // Connect to Pusher
    if (pusherClient.connection.state !== "connected") {
      pusherClient.connect();
    }

    return () => {
      pusherClient.unsubscribe("presence-global");
      pusherClient.disconnect();
    };
  }, []);

  // Subscribe to private channels when profile becomes available and we're connected
  useEffect(() => {
    if (currentProfileId && isConnected && pusherClient.connection.socket_id) {
      console.log("[PUSHER] Profile available, subscribing to private channels");
      
      const userChannel = pusherClient.subscribe(`private-user-${currentProfileId}`);
      const pageContextChannel = pusherClient.subscribe(`private-page-context-${currentProfileId}`);

      pageContextChannel.bind("page:context:update", (pageInfo: any) => {
        console.log("Page context updated:", pageInfo);
      });

      return () => {
        pusherClient.unsubscribe(`private-user-${currentProfileId}`);
        pusherClient.unsubscribe(`private-page-context-${currentProfileId}`);
      };
    }
  }, [currentProfileId, isConnected]);

  return (
    <PusherContext.Provider value={{ socket: socketInterface, pusher: pusherClient, isConnected }}>
      {children}
    </PusherContext.Provider>
  );
};
