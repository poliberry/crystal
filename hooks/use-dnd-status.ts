"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export const useDNDStatus = () => {
  const [isDND, setIsDND] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch status from database
  const fetchStatus = async () => {
    try {
      const response = await axios.get("/api/user/status");
      const { status, isDND: dndStatus } = response.data;
      setCurrentStatus(status);
      setIsDND(dndStatus);
    } catch (error) {
      console.error("Failed to fetch user status:", error);
      // Fallback to localStorage if API fails
      if (typeof window !== "undefined") {
        const storedStatus = localStorage.getItem("user-presence-status");
        if (storedStatus) {
          setCurrentStatus(storedStatus);
          setIsDND(storedStatus === "DND");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Function to update status both in DB and localStorage
  const updateStatus = async (newStatus: string) => {
    try {
      setLoading(true);
      const response = await axios.patch("/api/user/status", {
        status: newStatus
      });
      const { status, isDND: dndStatus } = response.data;
      setCurrentStatus(status);
      setIsDND(dndStatus);
      
      // Also update localStorage for immediate access
      if (typeof window !== "undefined") {
        localStorage.setItem("user-presence-status", status);
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    isDND,
    currentStatus,
    loading,
    updateStatus,
    refetchStatus: fetchStatus,
  };
};

// Enhanced utility function to check if user should receive notifications
export const shouldReceiveNotifications = async (): Promise<boolean> => {
  try {
    const response = await axios.get("/api/user/status");
    return !response.data.isDND;
  } catch (error) {
    // Fallback to localStorage if API fails
    if (typeof window !== "undefined") {
      const status = localStorage.getItem("user-presence-status");
      return status !== "DND";
    }
    return true; // Default to allowing notifications if we can't determine status
  }
};

// Enhanced utility function to check if user should receive call alerts
export const shouldReceiveCallAlerts = async (): Promise<boolean> => {
  try {
    const response = await axios.get("/api/user/status");
    return !response.data.isDND;
  } catch (error) {
    // Fallback to localStorage if API fails
    if (typeof window !== "undefined") {
      const status = localStorage.getItem("user-presence-status");
      return status !== "DND";
    }
    return true; // Default to allowing call alerts if we can't determine status
  }
};

// Synchronous utility function to get current user status from localStorage (for immediate checks)
export const getCurrentUserStatusSync = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user-presence-status");
};

// Async utility function to get current user status from database
export const getCurrentUserStatus = async (): Promise<string | null> => {
  try {
    const response = await axios.get("/api/user/status");
    return response.data.status;
  } catch (error) {
    console.error("Failed to fetch user status:", error);
    return getCurrentUserStatusSync();
  }
};
