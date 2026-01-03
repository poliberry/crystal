// This hook is no longer needed with Convex
// Convex queries automatically update in real-time when data changes
// Simply use useQuery from convex/react instead

import { useEffect } from "react";

type ChatSocketProps = {
  addKey: string;
  updateKey: string;
  queryKey: string;
};

// Deprecated: Use Convex queries directly - they update automatically
export const useChatSocket = ({
  addKey,
  updateKey,
  queryKey,
}: ChatSocketProps) => {
  // No-op: Convex handles real-time updates automatically
  useEffect(() => {
    // Convex queries are reactive and update automatically
    // No manual socket event handling needed
  }, [addKey, queryKey, updateKey]);
};
