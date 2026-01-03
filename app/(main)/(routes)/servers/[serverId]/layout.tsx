"use client";

import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";

import { ServerSidebar } from "@/components/server/server-sidebar";
import { MemberSidebar } from "@/components/server/member-sidebar";
import { MemberSidebarWrapper } from "@/components/server/member-sidebar-wrapper";
import {
  SidebarInset,
  SidebarTrigger,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const ServerIdLayout = ({
  children,
  params,
}: PropsWithChildren<{
  params: Promise<{
    serverId: string;
  }>;
}>) => {
  const { user } = useAuthStore();
  const resolvedParams = use(params);

  // Get profile from Convex
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  // Get server from Convex
  const server = useQuery(
    api.servers.getById,
    resolvedParams.serverId
      ? { serverId: resolvedParams.serverId as any }
      : "skip"
  );

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

  // Check if user is a member
  const isMember = server.members?.some(
    (member: any) => member.profileId === profile._id
  );

  if (!isMember) {
    redirect("/");
    return null;
  }

  return (
    <div className="bg-sidebar w-full h-full flex flex-row overflow-hidden">
      <div className="w-[15%]">
        <ServerSidebar serverId={resolvedParams.serverId} />
      </div>
      <div className="pb-2 pr-2 bg-transparent flex-1 min-w-0 h-full overflow-hidden">
        <div className="bg-background w-full h-full min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
      <div className="w-[15%]">
        <MemberSidebar
          serverId={resolvedParams.serverId}
          initialData={server}
          currentProfile={profile}
        />
      </div>
    </div>
  );
};

export default ServerIdLayout;

/*
 <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
*/
