"use client";

import { redirect } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";

type InviteCodePageProps = {
  params: {
    inviteCode: string;
  };
};

const InviteCodePage = ({ params }: InviteCodePageProps) => {
  const { user } = useAuthStore();
  const joinServer = useMutation(api.servers.joinByInviteCode);
  const [hasJoined, setHasJoined] = useState(false);

  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  const servers = useQuery(
    api.servers.getMyServers,
    user?.userId ? { userId: user.userId } : "skip"
  );

  useEffect(() => {
    const handleJoin = async () => {
      if (!profile || !params.inviteCode || hasJoined) return;

      try {
        // Check if user is already a member
        const existingServer = servers?.find(
          (s: any) => s.inviteCode === params.inviteCode
        );

        if (existingServer) {
          redirect(`/servers/${existingServer._id}`);
          return;
        }

        setHasJoined(true);

        // Join the server
        const server = await joinServer({
          inviteCode: params.inviteCode,
          userId: user?.userId,
        });

        if (server) {
          redirect(`/servers/${server._id}`);
        }
      } catch (error) {
        console.error("Error joining server:", error);
        redirect("/");
      }
    };

    if (profile && params.inviteCode && servers !== undefined) {
      handleJoin();
    }
  }, [profile, params.inviteCode, servers, user?.userId, joinServer, hasJoined]);

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

  if (!params.inviteCode) {
    redirect("/");
    return null;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
    </div>
  );
};

export default InviteCodePage;
