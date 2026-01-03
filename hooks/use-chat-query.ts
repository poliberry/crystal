// Updated to use Convex queries instead of React Query + API routes
// Convex queries are reactive and update automatically

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";

interface ChatQueryProps {
  queryKey: string;
  apiUrl: string; // Deprecated - kept for compatibility
  paramKey: "channelId" | "conversationId";
  paramValue: string;
}

export const useChatQuery = ({
  queryKey,
  apiUrl, // Not used anymore
  paramKey,
  paramValue,
}: ChatQueryProps) => {
  const { user } = useAuthStore();

  // Use Convex query based on paramKey
  const data = useQuery(
    paramKey === "channelId"
      ? api.messages.getByChannel
      : api.directMessages.getByConversation,
    paramValue && user?.userId
      ? {
          [paramKey]: paramValue as any,
          userId: user.userId,
        }
      : "skip"
  );

  // Convex queries handle pagination differently
  // For now, return a compatible structure
  return {
    data: data
      ? {
          pages: [
            {
              items: data.items || [],
              nextCursor: data.nextCursor || null,
            },
          ],
        }
      : undefined,
    fetchNextPage: async () => {
      // TODO: Implement pagination with Convex
      console.warn("Pagination not yet implemented with Convex");
    },
    hasNextPage: !!data?.nextCursor,
    isFetchingNextPage: false,
    status: data ? "success" : "loading",
  };
};
