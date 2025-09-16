"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { usePusher } from "./pusher-provider";
import { UserStatus } from "@prisma/client";
import axios from "axios";

interface StatusContextType {
  status: UserStatus;
  customStatus: string | null;
  prevStatus: UserStatus | null;
  loading: boolean;
  setStatus: (status: UserStatus) => Promise<void>;
  setCustomStatus: (customStatus: string | null) => Promise<void>;
  setBoth: (status: UserStatus, customStatus: string | null) => Promise<void>;
}

const StatusContext = createContext<StatusContextType>({
  status: UserStatus.OFFLINE,
  customStatus: null,
  prevStatus: null,
  loading: true,
  setStatus: async () => {},
  setCustomStatus: async () => {},
  setBoth: async () => {},
});

export const useStatus = () => {
  return useContext(StatusContext);
};

export const StatusProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  const { pusher, isConnected } = usePusher();
  const [status, setStatusState] = useState<UserStatus>(UserStatus.OFFLINE);
  const [customStatus, setCustomStatusState] = useState<string | null>(null);
  const [prevStatus, setPrevStatusState] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Fetch current profile
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, [user]);

  // Initialize status from localStorage and server
  useEffect(() => {
    if (!profile || !user) return;

    const initializeStatus = async () => {
      try {
        setLoading(true);
        
        // Check localStorage for previous status and user preferences
        let preferredStatus: UserStatus | null = null;
        let preferredCustomStatus: string | null = null;
        let storedPrevStatus: UserStatus | null = null;
        
        if (typeof window !== "undefined") {
          const localStatus = localStorage.getItem(`discord-status-${user.id}`);
          const localCustomStatus = localStorage.getItem(`discord-custom-status-${user.id}`);
          const localPrevStatus = localStorage.getItem(`discord-prev-status-${user.id}`);
          
          // If user has a stored previous status and current status is OFFLINE, restore previous status
          if (localPrevStatus && Object.values(UserStatus).includes(localPrevStatus as UserStatus)) {
            storedPrevStatus = localPrevStatus as UserStatus;
          }
          
          if (localStatus && Object.values(UserStatus).includes(localStatus as UserStatus)) {
            const storedStatus = localStatus as UserStatus;
            // If stored status is OFFLINE but we have a previous status, use previous status
            if (storedStatus === UserStatus.OFFLINE && storedPrevStatus) {
              preferredStatus = storedPrevStatus;
              console.log("[STATUS_PROVIDER] Restoring previous status from OFFLINE:", storedPrevStatus);
            } else {
              preferredStatus = storedStatus;
            }
          }
          
          if (localCustomStatus) {
            preferredCustomStatus = localCustomStatus;
          }
        }

        // Get current status from server
        const response = await axios.get("/api/user/status");
        const { 
          status: serverStatus, 
          presenceStatus: serverCustomStatus, 
          prevStatus: serverPrevStatus 
        } = response.data;

        // Determine final status: prefer localStorage, then server, then default to ONLINE
        let finalStatus = preferredStatus || serverStatus || UserStatus.ONLINE;
        
        // If server status is OFFLINE but we have a previous status, restore it
        if (serverStatus === UserStatus.OFFLINE && (storedPrevStatus || serverPrevStatus)) {
          finalStatus = storedPrevStatus || serverPrevStatus || UserStatus.ONLINE;
          console.log("[STATUS_PROVIDER] Restoring from server OFFLINE to:", finalStatus);
        }
        
        const finalCustomStatus = preferredCustomStatus !== null ? preferredCustomStatus : serverCustomStatus;
        const finalPrevStatus = storedPrevStatus || serverPrevStatus;

        // Update local state
        setStatusState(finalStatus);
        setCustomStatusState(finalCustomStatus);
        setPrevStatusState(finalPrevStatus);

        // Update server if different from current
        if (finalStatus !== serverStatus || finalCustomStatus !== serverCustomStatus) {
          await axios.post("/api/user/discord-status", {
            status: finalStatus,
            presenceStatus: finalCustomStatus
          });
        }

        // Ensure localStorage is in sync
        if (typeof window !== "undefined") {
          localStorage.setItem(`discord-status-${user.id}`, finalStatus);
          if (finalCustomStatus) {
            localStorage.setItem(`discord-custom-status-${user.id}`, finalCustomStatus);
          } else {
            localStorage.removeItem(`discord-custom-status-${user.id}`);
          }
          if (finalPrevStatus) {
            localStorage.setItem(`discord-prev-status-${user.id}`, finalPrevStatus);
          }
        }

        console.log("[STATUS_PROVIDER] Initialized status:", {
          status: finalStatus,
          customStatus: finalCustomStatus,
          prevStatus: finalPrevStatus,
          serverStatus,
          serverCustomStatus,
          serverPrevStatus,
          preferredStatus,
          storedPrevStatus
        });

      } catch (error) {
        console.error("Failed to initialize status:", error);
        
        // Fallback to localStorage if server fails
        if (typeof window !== "undefined") {
          const localStatus = localStorage.getItem(`discord-status-${user.id}`);
          const localCustomStatus = localStorage.getItem(`discord-custom-status-${user.id}`);
          
          if (localStatus && Object.values(UserStatus).includes(localStatus as UserStatus)) {
            setStatusState(localStatus as UserStatus);
          } else {
            setStatusState(UserStatus.ONLINE);
          }
          
          if (localCustomStatus) {
            setCustomStatusState(localCustomStatus);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initializeStatus();
  }, [profile, user]);

  // Listen for Pusher status updates
  useEffect(() => {
    if (!pusher || !isConnected || !user) return;

    const channel = pusher.subscribe("presence");

    const handleStatusUpdate = (data: { 
      userId: string; 
      status: UserStatus; 
      presenceStatus?: string | null;
      prevStatus?: UserStatus;
    }) => {
      if (data.userId === user.id) {
        console.log("[STATUS_PROVIDER] Received status update:", data);
        setStatusState(data.status);
        if (data.presenceStatus !== undefined) {
          setCustomStatusState(data.presenceStatus);
        }
        if (data.prevStatus) {
          setPrevStatusState(data.prevStatus);
        }
      }
    };

    channel.bind("user:status:update", handleStatusUpdate);
    channel.bind("user:presence:update", handleStatusUpdate);
    channel.bind("presence-status-update", handleStatusUpdate);

    return () => {
      channel.unbind("user:status:update", handleStatusUpdate);
      channel.unbind("user:presence:update", handleStatusUpdate);
      channel.unbind("presence-status-update", handleStatusUpdate);
      pusher.unsubscribe("presence");
    };
  }, [pusher, isConnected, user]);

  // Handle page visibility changes
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // When page becomes visible, check if we should restore previous status
        const storedPrevStatus = localStorage.getItem(`discord-prev-status-${user.id}`);
        const currentStoredStatus = localStorage.getItem(`discord-status-${user.id}`);
        
        // If current status is OFFLINE and we have a previous status, restore it
        if (currentStoredStatus === UserStatus.OFFLINE && storedPrevStatus && 
            Object.values(UserStatus).includes(storedPrevStatus as UserStatus)) {
          console.log("[STATUS_PROVIDER] Page visible - restoring status from OFFLINE to:", storedPrevStatus);
          setStatus(storedPrevStatus as UserStatus);
        } else if (status === UserStatus.OFFLINE && prevStatus) {
          console.log("[STATUS_PROVIDER] Page visible - restoring status from state:", prevStatus);
          setStatus(prevStatus);
        }
      } else if (document.visibilityState === "hidden") {
        // When page becomes hidden, save current status as previous
        if (status !== UserStatus.OFFLINE) {
          localStorage.setItem(`discord-prev-status-${user.id}`, status);
          console.log("[STATUS_PROVIDER] Page hidden - saved previous status:", status);
        }
      }
    };

    const handleBeforeUnload = () => {
      // Save current status as previous and set to offline
      if (typeof window !== "undefined" && status !== UserStatus.OFFLINE) {
        localStorage.setItem(`discord-prev-status-${user.id}`, status);
        navigator.sendBeacon("/api/user/discord-status", JSON.stringify({ 
          status: UserStatus.OFFLINE,
          presenceStatus: customStatus
        }));
        console.log("[STATUS_PROVIDER] Before unload - saved previous status:", status);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, status, customStatus, prevStatus]);

  // Status management functions
  const setStatus = async (newStatus: UserStatus) => {
    if (!user) return;
    
    try {
      console.log("[STATUS_PROVIDER] Setting status:", newStatus);
      
      // Update previous status
      setPrevStatusState(status);
      setStatusState(newStatus);
      
      // Store in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`discord-status-${user.id}`, newStatus);
        localStorage.setItem(`discord-prev-status-${user.id}`, status);
      }
      
      // Update server
      await axios.post("/api/user/discord-status", {
        status: newStatus
      });
      
    } catch (error) {
      console.error("Failed to set status:", error);
      // Revert on error
      setStatusState(status);
    }
  };

  const setCustomStatus = async (newCustomStatus: string | null) => {
    if (!user) return;
    
    try {
      console.log("[STATUS_PROVIDER] Setting custom status:", newCustomStatus);
      
      setCustomStatusState(newCustomStatus);
      
      // Store in localStorage
      if (typeof window !== "undefined") {
        if (newCustomStatus) {
          localStorage.setItem(`discord-custom-status-${user.id}`, newCustomStatus);
        } else {
          localStorage.removeItem(`discord-custom-status-${user.id}`);
        }
      }
      
      // Update server
      await axios.post("/api/user/discord-status", {
        presenceStatus: newCustomStatus
      });
      
    } catch (error) {
      console.error("Failed to set custom status:", error);
      // Revert on error
      setCustomStatusState(customStatus);
    }
  };

  const setBoth = async (newStatus: UserStatus, newCustomStatus: string | null) => {
    if (!user) return;
    
    try {
      console.log("[STATUS_PROVIDER] Setting both:", { status: newStatus, customStatus: newCustomStatus });
      
      // Update previous status and current status
      setPrevStatusState(status);
      setStatusState(newStatus);
      setCustomStatusState(newCustomStatus);
      
      // Store in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`discord-status-${user.id}`, newStatus);
        localStorage.setItem(`discord-prev-status-${user.id}`, status);
        if (newCustomStatus) {
          localStorage.setItem(`discord-custom-status-${user.id}`, newCustomStatus);
        } else {
          localStorage.removeItem(`discord-custom-status-${user.id}`);
        }
      }
      
      // Update server
      await axios.post("/api/user/discord-status", {
        status: newStatus,
        presenceStatus: newCustomStatus
      });
      
    } catch (error) {
      console.error("Failed to set both status and custom status:", error);
      // Revert on error
      setStatusState(status);
      setCustomStatusState(customStatus);
    }
  };

  return (
    <StatusContext.Provider 
      value={{ 
        status, 
        customStatus, 
        prevStatus, 
        loading, 
        setStatus, 
        setCustomStatus, 
        setBoth 
      }}
    >
      {children}
    </StatusContext.Provider>
  );
};
