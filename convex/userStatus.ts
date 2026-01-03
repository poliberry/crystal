import { query } from "./_generated/server";
import { requireProfile } from "./lib/helpers";

// Get current user status
export const getStatus = query({
  handler: async (ctx) => {
    const profile = await requireProfile(ctx);
    
    return {
      status: profile.status,
      presenceStatus: profile.presenceStatus,
      isDND: profile.status === "DND",
    };
  },
});

