"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useDNDStatus } from "@/hooks/use-dnd-status";
import { useUser } from "@clerk/nextjs";

interface DNDContextType {
  isDND: boolean;
  currentStatus: string | null;
  shouldShowNotifications: boolean;
  shouldShowCallAlerts: boolean;
}

const DNDContext = createContext<DNDContextType>({
  isDND: false,
  currentStatus: null,
  shouldShowNotifications: true,
  shouldShowCallAlerts: true,
});

export const useDND = () => useContext(DNDContext);

export const DNDProvider = ({ children }: { children: React.ReactNode }) => {
  const { isDND, currentStatus } = useDNDStatus();
  
  const value = {
    isDND,
    currentStatus,
    shouldShowNotifications: !isDND,
    shouldShowCallAlerts: !isDND,
  };

  return (
    <DNDContext.Provider value={value}>
      {children}
    </DNDContext.Provider>
  );
};
