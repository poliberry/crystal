import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { EnhancedMemberSidebar } from "./enhanced-member-sidebar-pusher";

type MemberSidebarWrapperProps = {
  serverId: string;
};

export const MemberSidebarWrapper = async ({ serverId }: MemberSidebarWrapperProps) => {
  const profile = await currentProfile();

  if (!profile) redirect("/");

  // Enhanced server data with roles
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
          memberRoles: {
            include: {
              role: true
            },
            orderBy: {
              role: {
                position: 'desc'
              }
            }
          }
        },
        orderBy: {
          role: "asc",
        },
      },
      roles: {
        include: {
          permissions: true
        },
        orderBy: {
          position: 'desc'
        }
      }
    },
  });

  if (!server) redirect("/");

  // Transform data to include flattened roles on members
  const enhancedServer = {
    ...server,
    members: server.members.map(member => ({
      ...member,
      roles: member.memberRoles.map(mr => mr.role)
    }))
  };

  return (
    <EnhancedMemberSidebar
      serverId={serverId}
      initialData={enhancedServer}
      currentProfile={profile}
    />
  );
};