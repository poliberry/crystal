"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const LAST_PATH_KEY = "discord-clone-last-path";
const EXCLUDED_PATHS = [
  "/",
  "/setup",
  "/sign-in",
  "/sign-up",
  "/api",
  "/_next",
  "/favicon.ico",
];

export const usePathTracker = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  // Function to check if a path should be excluded from tracking
  const shouldExcludePath = (path: string): boolean => {
    return EXCLUDED_PATHS.some(excluded => 
      path === excluded || path.startsWith(excluded)
    );
  };

  // Function to save the current path to localStorage
  const saveCurrentPath = (path: string) => {
    if (typeof window !== "undefined" && !shouldExcludePath(path)) {
      try {
        localStorage.setItem(LAST_PATH_KEY, path);
      } catch (error) {
        console.error("Failed to save path to localStorage:", error);
      }
    }
  };

  // Function to get the last saved path
  const getLastPath = (): string | null => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(LAST_PATH_KEY);
      } catch (error) {
        console.error("Failed to get path from localStorage:", error);
        return null;
      }
    }
    return null;
  };

  // Function to clear the saved path
  const clearLastPath = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(LAST_PATH_KEY);
      } catch (error) {
        console.error("Failed to clear path from localStorage:", error);
      }
    }
  };

  // Function to restore the last path if user is on root and has a saved path
  const restoreLastPath = () => {
    // Don't auto-restore in the hook since we handle it in the PathRestorer component
    return false;
  };

  // Track path changes
  useEffect(() => {
    if (isLoaded && pathname && user) {
      // Save the current path if it's not excluded
      if (!shouldExcludePath(pathname)) {
        saveCurrentPath(pathname);
      }
    }
  }, [pathname, user, isLoaded]);

  // Clear path when user logs out
  useEffect(() => {
    if (isLoaded && !user) {
      clearLastPath();
    }
  }, [user, isLoaded]);

  return {
    saveCurrentPath,
    getLastPath,
    clearLastPath,
    restoreLastPath,
  };
};
