"use client";

import { redirect } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect } from "react";
import { use } from "react";
import { Id } from "@/convex/_generated/dataModel";

type ServerIdPageProps = {
  params: Promise<{
    serverId: string;
  }>;
};

const ServerIdPage = ({ params }: ServerIdPageProps) => {
  const { user } = useAuthStore();
  const resolvedParams = use(params);
  
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const server = useQuery(
    api.servers.getById,
    resolvedParams.serverId ? { serverId: resolvedParams.serverId as Id<"servers"> } : "skip"
  );

  useEffect(() => {
    if (profile && server) {
      const isMember = server.members?.some(
        (member: any) => member?.profileId === profile?._id
      );

      if (!isMember) {
        redirect("/");
        return;
      }

      const initialChannel = server?.channels?.[0];
      if (initialChannel) {
        redirect(`/servers/${resolvedParams.serverId}/channels/${initialChannel?._id as Id<"channels">}`);
      }
    }
  }, [profile, server, resolvedParams.serverId]);

  if (profile === undefined || server === undefined) {
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

  if (!server) {
    redirect("/");
    return null;
  }

  return null;
};

export default ServerIdPage;
