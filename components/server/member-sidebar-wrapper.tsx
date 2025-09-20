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

  // Get server data
  const server = await db.server.findFirst({
    id: serverId,
  });

  if (!server) redirect("/");

  // Get channels for this server
  const channels = await db.channel.findMany({
    serverId: serverId,
  });

  // Get members for this server
  const members = await db.member.findMany({
    serverId: serverId,
  });

  // Get profiles for the members
  const memberProfiles = await Promise.all(
    members.map(async (member) => {
      const memberProfile = await db.profile.findFirst({
        id: member.profileId,
      });
      return {
        ...member,
        profile: memberProfile,
        roles: [], // Simplified for now - no complex role system yet
        memberRoles: []
      };
    })
  );

  // Create enhanced server object
  const enhancedServer = {
    ...server,
    channels: channels.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    members: memberProfiles.filter(member => member.profile !== null),
    roles: [] // Simplified for now
  };

  return (
    <EnhancedMemberSidebar
      serverId={serverId}
      initialData={enhancedServer}
      currentProfile={profile}
    />
  );
};