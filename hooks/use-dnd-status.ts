"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export const useDNDStatus = () => {
  const profile = useQuery(api.profiles.getCurrent);
  const updateStatusMutation = useMutation(api.profiles.updateStatus);

  const currentStatus = profile?.status || null;
  const isDND = currentStatus === "DND";
  const loading = profile === undefined;

  // Function to update status
  const updateStatus = async (newStatus: string) => {
    if (!profile) return;
    
    try {
      await updateStatusMutation({
        status: newStatus as "ONLINE" | "IDLE" | "DND" | "INVISIBLE" | "OFFLINE",
      });
      
      // Also update localStorage for immediate access
      if (typeof window !== "undefined") {
        localStorage.setItem("user-presence-status", newStatus);
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
      throw error;
    }
  };

  return {
    isDND,
    currentStatus,
    loading,
    updateStatus,
    refetchStatus: () => {}, // Convex queries auto-refetch
  };
};

// Enhanced utility function to check if user should receive notifications
export const shouldReceiveNotifications = (profile: { status: string } | null | undefined): boolean => {
  if (!profile) {
    // Fallback to localStorage if profile not available
    if (typeof window !== "undefined") {
      const status = localStorage.getItem("user-presence-status");
      return status !== "DND";
    }
    return true; // Default to allowing notifications
  }
  return profile.status !== "DND";
};

// Enhanced utility function to check if user should receive call alerts
export const shouldReceiveCallAlerts = (profile: { status: string } | null | undefined): boolean => {
  if (!profile) {
    // Fallback to localStorage if profile not available
    if (typeof window !== "undefined") {
      const status = localStorage.getItem("user-presence-status");
      return status !== "DND";
    }
    return true; // Default to allowing call alerts
  }
  return profile.status !== "DND";
};

// Synchronous utility function to get current user status from localStorage (for immediate checks)
export const getCurrentUserStatusSync = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user-presence-status");
};

// Get current user status from Convex query result
export const getCurrentUserStatus = (profile: { status: string } | null | undefined): string | null => {
  if (profile) {
    return profile.status;
  }
  return getCurrentUserStatusSync();
};
