"use client";

// Page context is now derived from route params and props
// No need for socket events - the context can be determined client-side

import { usePathname, useParams } from "next/navigation";
import { useEffect } from "react";

interface PageContextProviderProps {
  serverData?: {
    id: string;
    name: string;
    imageUrl: string;
  };
  channelData?: {
    id: string;
    name: string;
    type: string;
  };
  conversationData?: {
    id: string;
    name?: string;
    type: string;
    members?: any[];
  };
  currentProfile?: any;
  children: React.ReactNode;
}

export const PageContextProvider = ({
  serverData,
  channelData,
  conversationData,
  currentProfile,
  children,
}: PageContextProviderProps) => {
  const pathname = usePathname();
  const params = useParams();

  // Page context is now derived from props and route
  // No socket events needed - components can determine context from props
  useEffect(() => {
    // Context is handled by components using props
    // No need to emit socket events
  }, [serverData, channelData, conversationData, currentProfile, pathname]);

  return <>{children}</>;
};
