import { query } from "./_generated/server";
import { v } from "convex/values";

// Filter subscriber IDs based on notification settings and muted channels
// Returns only the userIds that should receive notifications
export const filterSubscribers = query({
  args: {
    subscriberIds: v.array(v.string()),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const filteredIds: string[] = [];

    for (const userId of args.subscriberIds) {
      // Get notification settings
      const settings = await ctx.db
        .query("notificationSettings")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .first();

      // Default to true if no settings exist
      const serverMessagesEnabled = settings?.serverMessages ?? true;

      // Check if channel is muted
      const muted = await ctx.db
        .query("mutedChannels")
        .withIndex("by_userId_channelId", (q: any) =>
          q.eq("userId", userId).eq("channelId", args.channelId)
        )
        .first();

      const isChannelMuted = !!muted;

      // Include if server messages are enabled AND channel is not muted
      if (serverMessagesEnabled && !isChannelMuted) {
        filteredIds.push(userId);
      }
    }

    return filteredIds;
  },
});

