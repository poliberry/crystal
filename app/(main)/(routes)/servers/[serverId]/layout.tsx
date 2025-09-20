import { currentUser, redirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { ServerSidebar } from "@/components/server/server-sidebar";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberSidebarWrapper } from "@/components/server/member-sidebar-wrapper";

const ServerIdLayout = async ({
  children,
  params,
}: PropsWithChildren<{
  params: Promise<{
    serverId: string;
  }>;
}>) => {
  // Await params first
  const { serverId } = await params;
  console.log('ServerIdLayout - serverId:', serverId);
  
  const profile = await currentProfile();

  if (!profile) return redirectToSignIn();

  console.log('ServerIdLayout - profile:', profile);

  // Check if user is a member of this server
  console.log('ServerIdLayout - checking membership for:', { serverId: serverId, profileId: profile.id });
  const member = await db.member.findFirst({
    serverId: serverId,
    profileId: profile.id,
  });

  console.log('ServerIdLayout - member found:', member);

  if (!member) {
    console.log('ServerIdLayout - no member found, redirecting to /');
    redirect("/");
  }

  // Get the server details
  console.log('ServerIdLayout - fetching server:', serverId);
  const server = await db.server.findFirst({
    id: serverId,
  });

  console.log('ServerIdLayout - server found:', server);

  if (!server) {
    console.log('ServerIdLayout - no server found, redirecting to /');
    redirect("/");
  }

  return (
    <div className="h-full flex flex-row overflow-hidden pointer-events-auto bg-gradient-to-b from-black to-[#000226]">
      <aside className="md:flex h-full w-96 flex-col inset-y-0 z-[10]">
        <ServerSidebar serverId={server.id} />
      </aside>
      
      <main className="h-full flex-1 bg-white dark:bg-[#313338] rounded-l-3xl overflow-hidden">
        {children}
      </main>
      
      <aside className="md:flex hidden h-full w-96 flex-col inset-y-0 z-[10]">
        <MemberSidebarWrapper serverId={server.id} />
      </aside>
    </div>
  );
};

export default ServerIdLayout;
