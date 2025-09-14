"use client";

import { useEffect, useCallback } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { usePresence } from "./use-presence";
import { UserStatus } from "@/lib/types";
import axios from "axios";

interface UseStatusInitializerProps {
  profile?: any;
}

export const useStatusInitializer = ({ profile }: UseStatusInitializerProps) => {
  const { socket, isConnected } = useSocket();
  const { setStatus, setPresenceStatus } = usePresence();

  // Initialize status from server and localStorage
  const initializeStatus = useCallback(async () => {
    if (!profile) return;

    try {
      // Check localStorage first for user preference
      let preferredStatus: UserStatus | null = null;
      let preferredPresenceStatus: string | null = null;
      
      if (typeof window !== "undefined") {
        const localStatus = localStorage.getItem("user-status");
        const localPresenceStatus = localStorage.getItem("user-presence-status");
        
        if (localStatus && Object.values(UserStatus).includes(localStatus as UserStatus)) {
          preferredStatus = localStatus as UserStatus;
        }
        if (localPresenceStatus !== null) {
          preferredPresenceStatus = localPresenceStatus;
        }
      }

      // Get current status from server
      const response = await axios.get("/api/user/status");
      const { status: serverStatus, presenceStatus: serverPresenceStatus } = response.data;

      // Use local preference if available, otherwise use server status
      const finalStatus = preferredStatus || serverStatus || UserStatus.ONLINE;
      const finalPresenceStatus = preferredPresenceStatus !== null ? preferredPresenceStatus : serverPresenceStatus;

      // Update status if it differs from server or if we want to set a preferred status
      if (finalStatus !== serverStatus || finalPresenceStatus !== serverPresenceStatus) {
        await setStatus(finalStatus);
        if (finalPresenceStatus !== serverPresenceStatus) {
          await setPresenceStatus(finalPresenceStatus);
        }
      }

      // Ensure localStorage is in sync
      if (typeof window !== "undefined") {
        localStorage.setItem("user-status", finalStatus);
        if (finalPresenceStatus) {
          localStorage.setItem("user-presence-status", finalPresenceStatus);
        }
      }

    } catch (error) {
      console.error("Failed to initialize status:", error);
      
      // Fallback to localStorage if server fails
      if (typeof window !== "undefined") {
        const localStatus = localStorage.getItem("user-status");
        const localPresenceStatus = localStorage.getItem("user-presence-status");
        
        if (localStatus && Object.values(UserStatus).includes(localStatus as UserStatus)) {
          setStatus(localStatus as UserStatus).catch(console.error);
        } else {
          // Default to ONLINE if nothing is stored
          setStatus(UserStatus.ONLINE).catch(console.error);
        }
        
        if (localPresenceStatus) {
          setPresenceStatus(localPresenceStatus).catch(console.error);
        }
      }
    }
  }, [profile, setStatus, setPresenceStatus]);

  // Initialize when profile is available
  useEffect(() => {
    if (profile) {
      initializeStatus();
    }
  }, [profile, initializeStatus]);

  // Handle page visibility changes to maintain status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && profile) {
        // When tab becomes visible, reinitialize status
        initializeStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [profile, initializeStatus]);

  // Handle socket reconnection
  useEffect(() => {
    if (isConnected && profile) {
      // When socket reconnects, reinitialize status
      initializeStatus();
    }
  }, [isConnected, profile, initializeStatus]);

  // Handle beforeunload to save current status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      // Send offline status when leaving (but don't clear localStorage)
      navigator.sendBeacon("/api/user/status", JSON.stringify({ 
        status: UserStatus.OFFLINE 
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return { initializeStatus };
};
