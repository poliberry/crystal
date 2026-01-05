import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentProfile, requireProfile } from "./lib/helpers";

// Get all muted servers for a user
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx, args.userId);
    if (!profile) return [];

    const muted = await ctx.db
      .query("mutedServers")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .collect();

    return muted.map((m) => m.serverId);
  },
});

// Check if a server is muted for a user
export const isMuted = query({
  args: { userId: v.string(), serverId: v.id("servers") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx, args.userId);
    if (!profile) return false;

    const muted = await ctx.db
      .query("mutedServers")
      .withIndex("by_userId_serverId", (q: any) =>
        q.eq("userId", args.userId).eq("serverId", args.serverId)
      )
      .first();

    return !!muted;
  },
});

// Mute a server
export const mute = mutation({
  args: {
    userId: v.string(),
    serverId: v.id("servers"),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    // Check if already muted
    const existing = await ctx.db
      .query("mutedServers")
      .withIndex("by_userId_serverId", (q: any) =>
        q.eq("userId", args.userId).eq("serverId", args.serverId)
      )
      .first();

    if (existing) {
      return existing; // Already muted
    }

    const mutedId = await ctx.db.insert("mutedServers", {
      profileId: profile._id,
      userId: args.userId,
      serverId: args.serverId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(mutedId);
  },
});

// Unmute a server
export const unmute = mutation({
  args: {
    userId: v.string(),
    serverId: v.id("servers"),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    const muted = await ctx.db
      .query("mutedServers")
      .withIndex("by_userId_serverId", (q: any) =>
        q.eq("userId", args.userId).eq("serverId", args.serverId)
      )
      .first();

    if (muted) {
      await ctx.db.delete(muted._id);
      return true;
    }

    return false;
  },
});

