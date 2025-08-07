"use client";

import { usePathname } from "next/navigation";
import { TopNavigation } from "@/components/navigation/top-navigation";

interface LayoutWithTopNavProps {
  children: React.ReactNode;
  currentProfile: any;
  currentServer?: any;
  currentChannel?: any;
  currentConversation?: any;
}

export const LayoutWithTopNav = ({
  children,
  currentProfile,
  currentServer,
  currentChannel,
  currentConversation,
}: LayoutWithTopNavProps) => {
  const pathname = usePathname();

  // Don't show top nav on root or loading pages
  if (pathname === "/" || pathname === "/loading") {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
