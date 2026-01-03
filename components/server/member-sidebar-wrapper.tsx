"use client";

import { redirect } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { MemberSidebar } from "./member-sidebar";

type MemberSidebarWrapperProps = {
  serverId: string;
};

export const MemberSidebarWrapper = ({ serverId }: MemberSidebarWrapperProps) => {
  const { user } = useAuthStore();
  
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const server = useQuery(
    api.servers.getById,
    serverId ? { serverId: serverId as any } : "skip"
  );

  if (profile === undefined || server === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    redirect("/");
    return null;
  }

  if (!server) {
    redirect("/");
    return null;
  }

  return (
    <MemberSidebar
      serverId={serverId}
      initialData={server}
      currentProfile={profile}
    />
  );
};
