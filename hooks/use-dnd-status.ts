"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export const useDNDStatus = () => {
  const { user } = useUser();
  const [isDND, setIsDND] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user?.publicMetadata?.presence) {
      const status = user.publicMetadata.presence as string;
      setCurrentStatus(status);
      setIsDND(status === "DND");
    }
  }, [user?.publicMetadata?.presence]);

  // Also check localStorage for immediate status
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedStatus = localStorage.getItem("user-presence-status");
      if (storedStatus) {
        setCurrentStatus(storedStatus);
        setIsDND(storedStatus === "DND");
      }
    }
  }, []);

  return {
    isDND,
    currentStatus,
  };
};

// Utility function to check if user should receive notifications
export const shouldReceiveNotifications = (userStatus?: string | null): boolean => {
  return userStatus !== "DND";
};

// Utility function to check if user should receive call modals/sounds
export const shouldReceiveCallAlerts = (userStatus?: string | null): boolean => {
  return userStatus !== "DND";
};
