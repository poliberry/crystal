"use client";

import { useSocket } from "@/components/providers/socket-provider";
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
  const { socket } = useSocket();
  const pathname = usePathname();
  const params = useParams();

  useEffect(() => {
    if (!socket || !currentProfile?.id) return;

    let pageInfo: any = {
      icon: "Hash",
      title: "Discord Clone",
      subtitle: "Welcome",
      avatar: null,
    };

    // Server context
    if (serverData && channelData) {
      pageInfo = {
        icon: channelData.type === "TEXT" ? "Hash" : 
              channelData.type === "AUDIO" ? "Users" : "MessageCircle",
        title: `#${channelData.name}`,
        subtitle: serverData.name,
        avatar: serverData.imageUrl,
      };
    }
    // Conversation context
    else if (conversationData) {
      const isDM = conversationData.type === "DIRECT_MESSAGE";
      const partner = isDM ? conversationData.members?.find(
        (m: any) => m.member.profileId !== currentProfile?.id
      )?.member : null;
      
      pageInfo = {
        icon: isDM ? "MessageCircle" : "Users",
        title: isDM ? partner?.profile?.name || "Unknown User" : 
               conversationData.name || "Group Chat",
        subtitle: isDM ? "Direct Message" : 
                 `Group • ${conversationData.members?.length || 0} members`,
        avatar: isDM ? partner?.profile?.imageUrl : null,
      };
    }

    // Emit page context to this user's specific room
    socket.emit("page:context:update", {
      profileId: currentProfile.id,
      pageInfo: pageInfo
    });
  }, [socket, serverData, channelData, conversationData, currentProfile, pathname]);

  return <>{children}</>;
};
