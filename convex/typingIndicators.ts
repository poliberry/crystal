import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

// Set typing indicator
export const setTyping = mutation({
  args: {
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("conversations")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    // Validate that either channelId or conversationId is provided
    if (!args.channelId && !args.conversationId) {
      throw new Error("Either channelId or conversationId must be provided");
    }

    const now = Date.now();

    // Check if typing indicator already exists
    const existing = args.channelId
      ? await ctx.db
          .query("typingIndicators")
          .withIndex("by_profileId_channelId", (q) =>
            q.eq("profileId", profile._id).eq("channelId", args.channelId)
          )
          .first()
      : await ctx.db
          .query("typingIndicators")
          .withIndex("by_profileId_conversationId", (q) =>
            q
              .eq("profileId", profile._id)
              .eq("conversationId", args.conversationId)
          )
          .first();

    if (existing) {
      // Update existing indicator
      await ctx.db.patch(existing._id, {
        updatedAt: now,
      });
    } else {
      // Create new indicator
      await ctx.db.insert("typingIndicators", {
        profileId: profile._id,
        channelId: args.channelId,
        conversationId: args.conversationId,
        updatedAt: now,
      });
    }
  },
});

// Clear typing indicator
export const clearTyping = mutation({
  args: {
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("conversations")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    // Validate that either channelId or conversationId is provided
    if (!args.channelId && !args.conversationId) {
      throw new Error("Either channelId or conversationId must be provided");
    }

    // Find and delete typing indicator
    const existing = args.channelId
      ? await ctx.db
          .query("typingIndicators")
          .withIndex("by_profileId_channelId", (q) =>
            q.eq("profileId", profile._id).eq("channelId", args.channelId)
          )
          .first()
      : await ctx.db
          .query("typingIndicators")
          .withIndex("by_profileId_conversationId", (q) =>
            q
              .eq("profileId", profile._id)
              .eq("conversationId", args.conversationId)
          )
          .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get typing indicators for a channel or conversation
export const getTyping = query({
  args: {
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("conversations")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate that either channelId or conversationId is provided
    if (!args.channelId && !args.conversationId) {
      return [];
    }

    const profile = args.userId
      ? await requireProfile(ctx, args.userId)
      : null;

    // Get all typing indicators for this channel/conversation
    const indicators = args.channelId
      ? await ctx.db
          .query("typingIndicators")
          .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
          .collect()
      : await ctx.db
          .query("typingIndicators")
          .withIndex("by_conversationId", (q) =>
            q.eq("conversationId", args.conversationId)
          )
          .collect();

    // Filter out expired indicators (older than 3 seconds)
    const now = Date.now();
    const validIndicators = indicators.filter(
      (indicator) => now - indicator.updatedAt < 3000
    );

    // Filter out current user's typing indicator
    const filteredIndicators = profile
      ? validIndicators.filter(
          (indicator) => indicator.profileId !== profile._id
        )
      : validIndicators;

    // Fetch profile data for each indicator
    const indicatorsWithProfiles = await Promise.all(
      filteredIndicators.map(async (indicator) => {
        const profileData = await ctx.db.get(indicator.profileId);
        return {
          ...indicator,
          profile: profileData,
        };
      })
    );

    return indicatorsWithProfiles;
  },
});

