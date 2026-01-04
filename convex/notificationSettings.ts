import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentProfile, requireProfile } from "./lib/helpers";

// Get notification settings for a user
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx, args.userId);
    if (!profile) return null;

    const settings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .first();

    // Return default settings if none exist
    if (!settings) {
      return {
        serverMessages: true,
        directMessages: true,
        friendRequests: true,
      };
    }

    return {
      serverMessages: settings.serverMessages,
      directMessages: settings.directMessages,
      friendRequests: settings.friendRequests,
    };
  },
});

// Update notification settings
export const update = mutation({
  args: {
    userId: v.string(),
    serverMessages: v.optional(v.boolean()),
    directMessages: v.optional(v.boolean()),
    friendRequests: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    const existing = await ctx.db
      .query("notificationSettings")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .first();

    const updates: any = {
      updatedAt: Date.now(),
    };
    if (args.serverMessages !== undefined) updates.serverMessages = args.serverMessages;
    if (args.directMessages !== undefined) updates.directMessages = args.directMessages;
    if (args.friendRequests !== undefined) updates.friendRequests = args.friendRequests;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return await ctx.db.get(existing._id);
    } else {
      // Create new settings with defaults
      const settingsId = await ctx.db.insert("notificationSettings", {
        profileId: profile._id,
        userId: args.userId,
        serverMessages: args.serverMessages ?? true,
        directMessages: args.directMessages ?? true,
        friendRequests: args.friendRequests ?? true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return await ctx.db.get(settingsId);
    }
  },
});

