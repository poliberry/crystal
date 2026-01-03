"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";

import { cn } from "@/lib/utils";

import { UserAvatar } from "../user-avatar";
import { UserDialog } from "../user-dialog";
import { Card } from "../ui/card";

type ServerMemberProps = {
  member: any;
  server: any;
  profile: any;
};

const roleIconMap = {
  ["GUEST"]: null,
  ["MODERATOR"]: <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />,
  ["ADMIN"]: <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />,
};

export const ServerMember = ({
  member,
  profile,
  server,
}: ServerMemberProps) => {
  const { user } = useAuthStore();

  // Handle cases where member.profile might be undefined or missing userId
  const memberProfileData = member.profile || {};
  const memberUserId = memberProfileData.userId;

  // Get real-time profile status from Convex
  const memberProfile = useQuery(
    api.profiles.getByUserId,
    memberUserId && user?.userId ? { userId: memberUserId } : "skip"
  );

  const onClick = () => {
    if (member.profile.name === profile?.name) {
      router.push(`/conversations/me`);
      return;
    } else {
      router.push(`/conversations/${member.id}`);
    }
  };
  const params = useParams();
  const router = useRouter();

  // Use status from Convex query, fallback to member prop
  const status = (memberProfile?.status ||
    memberProfileData.status ||
    "OFFLINE") as "ONLINE" | "IDLE" | "DND" | "INVISIBLE" | "OFFLINE";
  const icon = roleIconMap[member.role as keyof typeof roleIconMap];

  // Status indicator mapping
  const statusMap: Record<string, { color: string; text: string }> = {
    ONLINE: { color: "bg-green-500", text: "Online" },
    IDLE: { color: "bg-yellow-500", text: "Idle" },
    DND: { color: "bg-red-500", text: "Do Not Disturb" },
    INVISIBLE: { color: "bg-gray-400", text: "Invisible" },
  };

  const isOffline = status === "OFFLINE" || !status;

  // Handle ID format (Convex uses _id, Prisma uses id)
  const profileId = memberProfileData._id || memberProfileData.id;
  const serverId = (server as any)?._id || (server as any)?.id;
  const memberId = (member as any)?._id || (member as any)?.id;

  if (!memberProfileData || !profileId) {
    return null; // Don't render if profile data is missing
  }

  return (
    <div className="w-full">
      <UserDialog profileId={profileId} serverId={serverId}>
        <div className="w-full">
          <Card
            className={cn(
              "px-2 py-2 flex flex-row items-center gap-x-2 w-full min-w-0 hover:bg-foreground/5 transition"
            )}
          >
          <div className="relative">
            <UserAvatar
              src={memberProfileData.imageUrl || ""}
              alt={
                memberProfileData.globalName ||
                memberProfileData.name ||
                "Unknown"
              }
              className={cn(
                "h-8 w-8 md:h-8 md:w-8 transition",
                isOffline && "opacity-40"
              )}
            />
            {!isOffline && statusMap[status] && (
              <span
                className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 border-2 border-sidebar",
                  statusMap[status].color
                )}
                title={statusMap[status].text}
              />
            )}
          </div>
          <div className="flex-1 w-full">
            <p
              className={cn(
                "font-semibold text-sm group-hover:text-zinc-600 text-left dark:group-hover:text-zinc-300 transition",
                isOffline
                  ? "text-zinc-400 opacity-70"
                  : "text-zinc-500 dark:text-zinc-400",
                params?.memberId === memberId &&
                  (isOffline
                    ? ""
                    : "text-primary dark:text-zinc-200 dark:group-hover:text-white")
              )}
              style={
                !isOffline && member.roleData?.color && !params?.memberId
                  ? {
                      color: member.roleData.color,
                    }
                  : undefined
              }
            >
              {memberProfileData.globalName ||
                memberProfileData.name ||
                "Unknown"}
            </p>
          </div>
          {icon}
          </Card>
        </div>
      </UserDialog>
    </div>
  );
};
