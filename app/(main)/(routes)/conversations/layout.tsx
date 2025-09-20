import { currentUser, redirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { ServerSidebar } from "@/components/server/server-sidebar";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberSidebar } from "@/components/server/member-sidebar";
import React from "react";
import { ConversationSidebar } from "@/components/conversation/conversation-sidebar";

const ConversationsLayout = async ({ children }: { children: React.ReactNode }) => {
  const profile = await currentProfile();
  const user = await currentUser();

  if (!profile) {
    return redirectToSignIn({ returnBackUrl: "/conversations" });
  }

  // Temporarily disable profile update to debug UUID issue
  // TODO: Re-enable after fixing UUID conversion issue

  return (
    <div className="h-full flex flex-row overflow-hidden pointer-events-auto">
      <aside className="md:flex h-full w-96 flex-col inset-y-0 z-[10]">
        <ConversationSidebar />
      </aside>
      <main className="h-full w-full z-[20]">{children}</main>
    </div>
  );
};

export default ConversationsLayout;