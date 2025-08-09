"use client";

import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { io as ClientIO } from "socket.io-client";
import { useModal } from "@/hooks/use-modal-store";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useDND } from "@/components/providers/dnd-provider";

type SocketContextType = {
  socket: any | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: PropsWithChildren) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const { onOpen } = useModal();
  const params = useParams();
  const { user } = useUser();
  const { checkCallPermission } = useDND();

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
    const socketInstance = new (ClientIO as any)(
      process.env.NEXT_PUBLIC_BASE_URL!,
      {
        path: "/api/socket/io",
        addTrailingSlash: false,
      },
    );

    socketInstance.on("connect", () => {
      setIsConnected(true);
      
      // Join user-specific rooms
      if (currentProfileId) {
        socketInstance.emit("user:join", currentProfileId);
        socketInstance.emit("user:join:page-context", currentProfileId);
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    // Listen for incoming call events
    socketInstance.on("call:incoming", async (callData: any) => {
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

    // Listen for call declined events
    socketInstance.on("call:declined", (callData: any) => {
      // Redirect users away from the call if it was declined
      if (params?.conversationId === callData.conversationId) {
        window.location.href = `/conversations/${callData.conversationId}`;
      }
    });

    // Listen for call ended events
    socketInstance.on("call:ended", (callData: any) => {
      // Redirect users away from the call if it ended
      if (params?.conversationId === callData.conversationId) {
        window.location.href = `/conversations/${callData.conversationId}`;
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [onOpen, params?.conversationId, currentProfileId]);

  // Join rooms when profile ID becomes available
  useEffect(() => {
    if (socket && isConnected && currentProfileId) {
      (socket as any).emit("user:join", currentProfileId);
      (socket as any).emit("user:join:page-context", currentProfileId);
    }
  }, [socket, isConnected, currentProfileId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
