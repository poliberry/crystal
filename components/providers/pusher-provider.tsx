"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher";
import { UserStatus } from "@prisma/client";

type PusherContextType = {
  pusher: typeof pusherClient | null;
  isConnected: boolean;
};

const PusherContext = createContext<PusherContextType>({
  pusher: null,
  isConnected: false,
});

export const usePusher = () => {
  return useContext(PusherContext);
};

export const PusherProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    pusherClient.connection.bind("connected", () => {
      console.log("[PUSHER] Connected to Pusher");
      setIsConnected(true);
    });

    pusherClient.connection.bind("disconnected", () => {
      console.log("[PUSHER] Disconnected from Pusher");
      setIsConnected(false);
    });

    pusherClient.connection.bind("error", (error: any) => {
      console.error("[PUSHER] Connection error:", error);
      setIsConnected(false);
    });

    // Connect to Pusher
    if (pusherClient.connection.state !== "connected") {
      pusherClient.connect();
    }

    return () => {
      pusherClient.disconnect();
    };
  }, []);

  return (
    <PusherContext.Provider value={{ pusher: pusherClient, isConnected }}>
      {children}
    </PusherContext.Provider>
  );
};
