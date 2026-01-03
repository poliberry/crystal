"use client";

import { create } from "zustand";

interface User {
  profileId: string;
  userId: string;
  email: string;
  name: string;
  globalName?: string;
  imageUrl?: string;
  status?: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => {
  // Load user from localStorage on init
  let initialUser = null;
  if (typeof window !== "undefined") {
    try {
      const storedUser = localStorage.getItem("auth-user");
      initialUser = storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
    }
  }

  return {
    user: initialUser,
    isAuthenticated: !!initialUser,
    setUser: (user) => {
      if (typeof window !== "undefined") {
        try {
          if (user) {
            localStorage.setItem("auth-user", JSON.stringify(user));
          } else {
            localStorage.removeItem("auth-user");
          }
        } catch (error) {
          console.error("Error saving user to localStorage:", error);
        }
      }
      set({ user, isAuthenticated: !!user });
    },
    signOut: () => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("auth-user");
        } catch (error) {
          console.error("Error removing user from localStorage:", error);
        }
      }
      set({
        user: null,
        isAuthenticated: false,
      });
    },
  };
});

