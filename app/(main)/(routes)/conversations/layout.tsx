"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import React from "react";
import { ConversationSidebar } from "@/components/conversation/conversation-sidebar";

const ConversationsLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const updateProfile = useMutation(api.profiles.update);

  // Update profile when it loads (if needed)
  React.useEffect(() => {
    if (profile && profile.name === "Unnamed") {
      // Profile might need updating, but we don't have user data here
      // This will be handled by the auth provider
    }
  }, [profile]);

  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="h-full flex flex-row overflow-hidden pointer-events-auto bg-sidebar">
      <aside className="md:flex h-full w-96 flex-col inset-y-0 z-[10] px-2 pb-2">
        <ConversationSidebar />
      </aside>
      <main className="h-full w-full z-[20]">{children}</main>
    </div>
  );
};

export default ConversationsLayout;