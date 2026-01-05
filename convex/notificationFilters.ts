import { query } from "./_generated/server";
import { v } from "convex/values";

// Filter subscriber IDs based on notification settings, muted channels, and muted servers
// Returns only the userIds that should receive notifications
export const filterSubscribers = query({
  args: {
    subscriberIds: v.array(v.string()),
    channelId: v.id("channels"),
    serverId: v.id("servers"),
  },
  handler: async (ctx, args) => {
    const filteredIds: string[] = [];

    // Get server info to check server muting
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      return []; // Server doesn't exist
    }

    for (const userId of args.subscriberIds) {
      // Get notification settings
      const settings = await ctx.db
        .query("notificationSettings")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .first();

      // Default to true if no settings exist
      const serverMessagesEnabled = settings?.serverMessages ?? true;

      // Check if server is muted
      const serverMuted = await ctx.db
        .query("mutedServers")
        .withIndex("by_userId_serverId", (q: any) =>
          q.eq("userId", userId).eq("serverId", args.serverId)
        )
        .first();

      const isServerMuted = !!serverMuted;

      // Check if channel is muted
      const channelMuted = await ctx.db
        .query("mutedChannels")
        .withIndex("by_userId_channelId", (q: any) =>
          q.eq("userId", userId).eq("channelId", args.channelId)
        )
        .first();

      const isChannelMuted = !!channelMuted;

      // Include if:
      // - Server messages are enabled
      // - Server is not muted
      // - Channel is not muted
      if (serverMessagesEnabled && !isServerMuted && !isChannelMuted) {
        filteredIds.push(userId);
      }
    }

    return filteredIds;
  },
});

