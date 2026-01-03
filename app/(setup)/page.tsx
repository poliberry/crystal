"use client";

import { redirect } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { InitialModal } from "@/components/modals/initial-modal";

const SetupPage = () => {
  const { user } = useAuthStore();
  
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const servers = useQuery(
    api.servers.getMyServers,
    user?.userId ? { userId: user.userId } : "skip"
  );

  if (profile === undefined || servers === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    redirect("/sign-in");
    return null;
  }

  if (servers && servers.length > 0) {
    redirect(`/servers/${servers[0]._id}`);
    return null;
  }

  return <InitialModal />;
};

export default SetupPage;
