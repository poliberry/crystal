"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";

const HomePage = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  useEffect(() => {
    if (user === undefined) return; // Still loading

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    // If signed in, redirect to conversations
    router.push("/conversations");
  }, [user, router]);

  // Show loading state while checking authentication
  return (
    <div className="flex items-center justify-center h-screen bg-black"></div>
  );
};

export default HomePage;
