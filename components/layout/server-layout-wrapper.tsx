"use client";

import { LayoutWithTopNav } from "./layout-with-top-nav";

interface ServerLayoutWrapperProps {
  children: React.ReactNode;
  currentProfile: any;
  currentServer: any;
  currentChannel?: any;
}

export const ServerLayoutWrapper = ({
  children,
  currentProfile,
  currentServer,
  currentChannel,
}: ServerLayoutWrapperProps) => {
  return (
    <LayoutWithTopNav
      currentProfile={currentProfile}
      currentServer={currentServer}
      currentChannel={currentChannel}
    >
      {children}
    </LayoutWithTopNav>
  );
};
