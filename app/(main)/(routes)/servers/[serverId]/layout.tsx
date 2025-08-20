import { currentUser, redirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { ServerSidebar } from "@/components/server/server-sidebar";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberSidebar } from "@/components/server/member-sidebar";
import { MemberSidebarWrapper } from "@/components/server/member-sidebar-wrapper";

const ServerIdLayout = async ({
  children,
  params,
}: PropsWithChildren<{
  params: {
    serverId: string;
  };
}>) => {
  const profile = await currentProfile();
  const user = await currentUser();

  if (!profile) return redirectToSignIn();

  await db.profile.update({
    where: {
      userId: profile.userId,
    },
    data: {
      name: `${user?.username}`,
      imageUrl: `${user?.imageUrl}`,
      email: `${user?.emailAddresses[0].emailAddress}`
    }
  })

  const server = await db.server.findUnique({
    where: {
      id: params.serverId,
      members: {
        some: {
          profileId: profile.id,
        },
      },
    },
  });

  if (!server) redirect("/");

  return (
    <div className="h-full flex flex-row overflow-hidden pointer-events-auto">
      <aside className="md:flex h-full w-96 flex-col inset-y-0 z-[10]">
        <ServerSidebar serverId={params.serverId} />
      </aside>
      <main className="h-full w-full z-[20]">{children}</main>
      <aside className="md:flex h-full w-72 flex-col right-0 z-[10] inset-y-0">
        <MemberSidebarWrapper serverId={params.serverId} />
      </aside>
    </div>
  );
};

export default ServerIdLayout;
