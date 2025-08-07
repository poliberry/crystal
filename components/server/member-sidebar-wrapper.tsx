import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberSidebar } from "./member-sidebar";

type MemberSidebarWrapperProps = {
  serverId: string;
};

export const MemberSidebarWrapper = async ({ serverId }: MemberSidebarWrapperProps) => {
  const profile = await currentProfile();

  if (!profile) redirect("/");

  const server = await db.server.findUnique({
    where: {
      id: serverId,
    },
    include: {
      channels: {
        orderBy: {
          createdAt: "asc",
        },
      },
      members: {
        include: {
          profile: true,
        },
        orderBy: {
          role: "asc",
        },
      },
    },
  });

  if (!server) redirect("/");

  return (
    <MemberSidebar
      serverId={serverId}
      initialData={server}
      currentProfile={profile}
    />
  );
};