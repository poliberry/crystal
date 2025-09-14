"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { UserStatus } from "@/lib/types";
import axios from "axios";

interface UsePresenceProps {
  userId?: string;
  initialStatus?: UserStatus;
  initialPresenceStatus?: string | null;
}

interface PresenceState {
  status: UserStatus;
  presenceStatus: string | null;
  isOnline: boolean;
  lastSeen: Date;
}

export const usePresence = ({ userId, initialStatus, initialPresenceStatus }: UsePresenceProps = {}) => {
  const { socket } = useSocket();
  const [presence, setPresence] = useState<PresenceState>({
    status: initialStatus || UserStatus.OFFLINE,
    presenceStatus: initialPresenceStatus || null,
    isOnline: (initialStatus && initialStatus !== UserStatus.OFFLINE && initialStatus !== UserStatus.INVISIBLE) || false,
    lastSeen: new Date()
  });
  
  const [loading, setLoading] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  // Debounced update function to prevent multiple rapid updates
  const updatePresence = useCallback((newStatus: UserStatus, newPresenceStatus?: string | null) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return; // Debounce 100ms
    lastUpdateRef.current = now;

    setPresence(prev => ({
      ...prev,
      status: newStatus,
      presenceStatus: newPresenceStatus !== undefined ? newPresenceStatus : prev.presenceStatus,
      isOnline: newStatus !== UserStatus.OFFLINE && newStatus !== UserStatus.INVISIBLE,
      lastSeen: new Date()
    }));
  }, []);

  // Load initial presence from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedStatus = localStorage.getItem("user-status");
    const storedPresenceStatus = localStorage.getItem("user-presence-status");
    
    if (storedStatus && !initialStatus) {
      try {
        const status = storedStatus as UserStatus;
        updatePresence(status, storedPresenceStatus);
        
        // Also sync with server to ensure consistency
        axios.post("/api/user/status", {
          status: status,
          presenceStatus: storedPresenceStatus
        }).catch(error => {
          console.error("Failed to sync status with server:", error);
        });
      } catch (error) {
        console.error("Failed to parse stored status:", error);
      }
    } else if (initialStatus) {
      // If we have an initial status, make sure it's stored locally
      localStorage.setItem("user-status", initialStatus);
      if (initialPresenceStatus) {
        localStorage.setItem("user-presence-status", initialPresenceStatus);
      }
    }
  }, [initialStatus, initialPresenceStatus, updatePresence]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: { userId: string; status: UserStatus }) => {
      if (!userId || data.userId === userId) {
        updatePresence(data.status);
      }
    };

    const handlePresenceUpdate = (data: { userId: string; presenceStatus: string | null }) => {
      if (!userId || data.userId === userId) {
        updatePresence(presence.status, data.presenceStatus);
      }
    };

    // Listen to multiple event types for better coverage
    socket.on("user:status:update", handleStatusUpdate);
    socket.on("user:presence:update", handlePresenceUpdate);
    socket.on("presence-status-update", handlePresenceUpdate);
    socket.on("user-status-change", handleStatusUpdate);

    return () => {
      socket.off("user:status:update", handleStatusUpdate);
      socket.off("user:presence:update", handlePresenceUpdate);
      socket.off("presence-status-update", handlePresenceUpdate);
      socket.off("user-status-change", handleStatusUpdate);
    };
  }, [socket, userId, presence.status, updatePresence]);

  // Function to set status with persistence
  const setStatus = useCallback(async (newStatus: UserStatus) => {
    setLoading(true);
    try {
      // Update locally first for immediate feedback
      updatePresence(newStatus);
      
      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("user-status", newStatus);
      }

      // Update on server
      await axios.post("/api/user/status", {
        status: newStatus
      });

    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert on error
      if (initialStatus) {
        updatePresence(initialStatus);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [updatePresence, initialStatus]);

  // Function to set custom presence status
  const setPresenceStatus = useCallback(async (newPresenceStatus: string | null) => {
    setLoading(true);
    try {
      // Update locally first
      updatePresence(presence.status, newPresenceStatus);
      
      // Persist to localStorage
      if (typeof window !== "undefined") {
        if (newPresenceStatus) {
          localStorage.setItem("user-presence-status", newPresenceStatus);
        } else {
          localStorage.removeItem("user-presence-status");
        }
      }

      // Update on server
      await axios.post("/api/user/status", {
        presenceStatus: newPresenceStatus
      });

    } catch (error) {
      console.error("Failed to update presence status:", error);
      // Revert on error
      updatePresence(presence.status, initialPresenceStatus);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [presence.status, updatePresence, initialPresenceStatus]);

  return {
    ...presence,
    loading,
    setStatus,
    setPresenceStatus,
    updatePresence
  };
};
