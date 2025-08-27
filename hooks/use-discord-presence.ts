"use client";

import { useEffect, useState, useCallback } from "react";
import { UserStatus } from "@prisma/client";
import { useSocket } from "@/components/providers/socket-provider";
import axios from "axios";

interface DiscordPresenceHook {
  status: UserStatus;
  customStatus: string | null;
  loading: boolean;
  setStatus: (status: UserStatus) => Promise<void>;
  setCustomStatus: (customStatus: string | null) => Promise<void>;
  setBoth: (status: UserStatus, customStatus: string | null) => Promise<void>;
}

interface UseDiscordPresenceProps {
  userId: string;
  initialStatus?: UserStatus;
  initialCustomStatus?: string | null;
}

/**
 * Discord-like presence hook that manages user status and custom status
 */
export function useDiscordPresence({
  userId,
  initialStatus = UserStatus.OFFLINE,
  initialCustomStatus = null
}: UseDiscordPresenceProps): DiscordPresenceHook {
  const { socket } = useSocket();
  const [status, setStatusState] = useState<UserStatus>(initialStatus);
  const [customStatus, setCustomStatusState] = useState<string | null>(initialCustomStatus);
  const [loading, setLoading] = useState(false);

  // Initialize from localStorage and sync with server
  useEffect(() => {
    const initializePresence = async () => {
      try {
        // Get stored values from localStorage
        const storedStatus = localStorage.getItem(`discord-status-${userId}`);
        const storedCustomStatus = localStorage.getItem(`discord-custom-status-${userId}`);
        
        let finalStatus = initialStatus;
        let finalCustomStatus = initialCustomStatus;
        
        // Use stored values if available
        if (storedStatus && Object.values(UserStatus).includes(storedStatus as UserStatus)) {
          finalStatus = storedStatus as UserStatus;
        }
        if (storedCustomStatus !== null) {
          finalCustomStatus = storedCustomStatus;
        }
        
        // Update local state
        setStatusState(finalStatus);
        setCustomStatusState(finalCustomStatus);
        
        // Sync with server if different from initial
        if (finalStatus !== initialStatus || finalCustomStatus !== initialCustomStatus) {
          await axios.post("/api/user/status", {
            status: finalStatus,
            presenceStatus: finalCustomStatus
          });
        }
      } catch (error) {
        console.error("Failed to initialize presence:", error);
      }
    };

    if (userId) {
      initializePresence();
    }
  }, [userId, initialStatus, initialCustomStatus]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !userId) return;

    const handleStatusUpdate = (data: { userId: string; status: UserStatus; presenceStatus?: string }) => {
      if (data.userId === userId) {
        console.log("[DISCORD_PRESENCE] Received status update:", data);
        setStatusState(data.status);
        if (data.presenceStatus !== undefined) {
          setCustomStatusState(data.presenceStatus);
        }
      }
    };

    const handlePresenceUpdate = (data: { userId: string; presenceStatus: string | null; status?: UserStatus }) => {
      if (data.userId === userId) {
        console.log("[DISCORD_PRESENCE] Received presence update:", data);
        setCustomStatusState(data.presenceStatus);
        if (data.status) {
          setStatusState(data.status);
        }
      }
    };

    // Listen to multiple event types for reliability
    socket.on("user:status:update", handleStatusUpdate);
    socket.on("user:presence:update", handlePresenceUpdate);
    socket.on("presence-status-update", handleStatusUpdate);

    return () => {
      socket.off("user:status:update", handleStatusUpdate);
      socket.off("user:presence:update", handlePresenceUpdate);
      socket.off("presence-status-update", handleStatusUpdate);
    };
  }, [socket, userId]);

  // Set status only
  const setStatus = useCallback(async (newStatus: UserStatus) => {
    setLoading(true);
    try {
      console.log("[DISCORD_PRESENCE] Setting status:", newStatus);
      
      // Update local state immediately
      setStatusState(newStatus);
      
      // Store in localStorage
      localStorage.setItem(`discord-status-${userId}`, newStatus);
      
      // Update server
      await axios.post("/api/user/status", {
        status: newStatus
      });
      
    } catch (error) {
      console.error("Failed to set status:", error);
      // Revert on error
      setStatusState(status);
    } finally {
      setLoading(false);
    }
  }, [userId, status]);

  // Set custom status only
  const setCustomStatus = useCallback(async (newCustomStatus: string | null) => {
    setLoading(true);
    try {
      console.log("[DISCORD_PRESENCE] Setting custom status:", newCustomStatus);
      
      // Update local state immediately
      setCustomStatusState(newCustomStatus);
      
      // Store in localStorage
      if (newCustomStatus) {
        localStorage.setItem(`discord-custom-status-${userId}`, newCustomStatus);
      } else {
        localStorage.removeItem(`discord-custom-status-${userId}`);
      }
      
      // Update server
      await axios.post("/api/user/status", {
        presenceStatus: newCustomStatus
      });
      
    } catch (error) {
      console.error("Failed to set custom status:", error);
      // Revert on error
      setCustomStatusState(customStatus);
    } finally {
      setLoading(false);
    }
  }, [userId, customStatus]);

  // Set both status and custom status
  const setBoth = useCallback(async (newStatus: UserStatus, newCustomStatus: string | null) => {
    setLoading(true);
    try {
      console.log("[DISCORD_PRESENCE] Setting both:", { status: newStatus, customStatus: newCustomStatus });
      
      // Update local state immediately
      setStatusState(newStatus);
      setCustomStatusState(newCustomStatus);
      
      // Store in localStorage
      localStorage.setItem(`discord-status-${userId}`, newStatus);
      if (newCustomStatus) {
        localStorage.setItem(`discord-custom-status-${userId}`, newCustomStatus);
      } else {
        localStorage.removeItem(`discord-custom-status-${userId}`);
      }
      
      // Update server
      await axios.post("/api/user/status", {
        status: newStatus,
        presenceStatus: newCustomStatus
      });
      
    } catch (error) {
      console.error("Failed to set presence:", error);
      // Revert on error
      setStatusState(status);
      setCustomStatusState(customStatus);
    } finally {
      setLoading(false);
    }
  }, [userId, status, customStatus]);

  return {
    status,
    customStatus,
    loading,
    setStatus,
    setCustomStatus,
    setBoth
  };
}
