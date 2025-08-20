"use client";

import { LayoutWithTopNav } from "./layout-with-top-nav";

interface ConversationLayoutWrapperProps {
  children: React.ReactNode;
  currentProfile: any;
  currentConversation: any;
}

export const ConversationLayoutWrapper = ({
  children,
  currentProfile,
  currentConversation,
}: ConversationLayoutWrapperProps) => {
  return (
    <LayoutWithTopNav
      currentProfile={currentProfile}
      currentConversation={currentConversation}
    >
      {children}
    </LayoutWithTopNav>
  );
};
