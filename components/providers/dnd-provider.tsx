"use client";

import { createContext, useContext } from "react";
import { useDNDStatus, shouldReceiveNotifications, shouldReceiveCallAlerts, getCurrentUserStatusSync } from "@/hooks/use-dnd-status";

interface DNDContextType {
  isDND: boolean;
  currentStatus: string | null;
  loading: boolean;
  shouldShowNotifications: boolean;
  shouldShowCallAlerts: boolean;
  checkNotificationPermission: () => Promise<boolean>;
  checkCallPermission: () => Promise<boolean>;
  updateStatus: (status: string) => Promise<void>;
  refetchStatus: () => Promise<void>;
}

const DNDContext = createContext<DNDContextType>({
  isDND: false,
  currentStatus: null,
  loading: false,
  shouldShowNotifications: true,
  shouldShowCallAlerts: true,
  checkNotificationPermission: async () => true,
  checkCallPermission: async () => true,
  updateStatus: async () => {},
  refetchStatus: async () => {},
});

export const useDND = () => useContext(DNDContext);

export const DNDProvider = ({ children }: { children: React.ReactNode }) => {
  const { isDND, currentStatus, loading, updateStatus, refetchStatus } = useDNDStatus();
  
  // Enhanced permission checking functions that use the async utility functions
  const checkNotificationPermission = async (): Promise<boolean> => {
    // For immediate checks, use sync version
    const syncStatus = getCurrentUserStatusSync();
    if (syncStatus) {
      return syncStatus !== "DND";
    }
    // Fall back to async check
    return await shouldReceiveNotifications();
  };

  const checkCallPermission = async (): Promise<boolean> => {
    // For immediate checks, use sync version
    const syncStatus = getCurrentUserStatusSync();
    if (syncStatus) {
      return syncStatus !== "DND";
    }
    // Fall back to async check
    return await shouldReceiveCallAlerts();
  };
  
  const value = {
    isDND,
    currentStatus,
    loading,
    shouldShowNotifications: !isDND,
    shouldShowCallAlerts: !isDND,
    checkNotificationPermission,
    checkCallPermission,
    updateStatus,
    refetchStatus,
  };

  return (
    <DNDContext.Provider value={value}>
      {children}
    </DNDContext.Provider>
  );
};
