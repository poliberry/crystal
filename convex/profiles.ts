import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentProfile, getOrCreateProfile, requireProfile } from "./lib/helpers";

// Get current user's profile by userId
export const getCurrent = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await getCurrentProfile(ctx, args.userId);
  },
});

// Get profile by ID
export const getById = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.profileId);
  },
});

// Get profile by userId (from auth provider)
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get profile by ID with server context (for user dialog)
export const getByIdWithServer = query({
  args: { 
    profileId: v.id("profiles"),
    serverId: v.optional(v.id("servers")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return null;

    const result: any = { ...profile };

    // If serverId is provided, get member info
    if (args.serverId) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_profileId_serverId", (q) =>
          q.eq("profileId", args.profileId).eq("serverId", args.serverId!)
        )
        .first();

      if (member) {
        result.member = member;
        result.role = member.role;
      }

      // Get mutual servers count
      const currentProfile = await getCurrentProfile(ctx, args.userId);
      if (currentProfile) {
        const currentServers = await ctx.db
          .query("members")
          .withIndex("by_profileId", (q) => q.eq("profileId", currentProfile._id))
          .collect();

        const targetServers = await ctx.db
          .query("members")
          .withIndex("by_profileId", (q) => q.eq("profileId", args.profileId))
          .collect();

        const currentServerIds = new Set(currentServers.map((m) => m.serverId));
        const mutualCount = targetServers.filter((m) =>
          currentServerIds.has(m.serverId)
        ).length;

        result.mutualServers = mutualCount;
      }
    }

    return result;
  },
});

// Create or update profile
export const createOrUpdate = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    globalName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await getOrCreateProfile(ctx, args.userId, {
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
    });
  },
});

// Update profile
export const update = mutation({
  args: {
    profileId: v.id("profiles"),
    name: v.optional(v.string()),
    globalName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    pronouns: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    customCss: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    if (profile._id !== args.profileId) {
      throw new Error("Unauthorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.globalName !== undefined) updates.globalName = args.globalName;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.pronouns !== undefined) updates.pronouns = args.pronouns;
    if (args.bannerUrl !== undefined) updates.bannerUrl = args.bannerUrl;
    if (args.customCss !== undefined) updates.customCss = args.customCss;

    await ctx.db.patch(args.profileId, updates);
    return await ctx.db.get(args.profileId);
  },
});

// Update user status
export const updateStatus = mutation({
  args: {
    status: v.union(
      v.literal("ONLINE"),
      v.literal("IDLE"),
      v.literal("DND"),
      v.literal("INVISIBLE"),
      v.literal("OFFLINE")
    ),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const updates: any = {
      updatedAt: Date.now(),
      status: args.status,
    };

    // When setting to OFFLINE, save current status as prevStatus (unless already OFFLINE)
    if (args.status === "OFFLINE") {
      // Save current status as prevStatus only if current status is not already OFFLINE
      if (profile.status !== "OFFLINE") {
        updates.prevStatus = profile.status;
      }
      // If already OFFLINE, don't change prevStatus
    } 
    // When restoring from OFFLINE, keep prevStatus unchanged (don't update it)
    else if (profile.status === "OFFLINE" && profile.prevStatus && profile.prevStatus !== "OFFLINE") {
      // Restoring from OFFLINE - keep prevStatus as is, just update status
      // Don't update prevStatus field at all
    }
    // All other status changes - save current status as prevStatus before updating
    else {
      // Always update prevStatus to current status when changing status
      // This allows users to restore to their previous status when coming back from IDLE or other states
      updates.prevStatus = profile.status;
    }

    await ctx.db.patch(profile._id, updates);
    return await ctx.db.get(profile._id);
  },
});

// Update presence status (custom status message, supports emojis)
export const updatePresenceStatus = mutation({
  args: {
    presenceStatus: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const updates: any = {
      updatedAt: Date.now(),
    };

    // If presenceStatus is null, undefined, or empty string, clear it
    if (args.presenceStatus === null || args.presenceStatus === undefined || args.presenceStatus.trim() === "") {
      updates.presenceStatus = undefined;
    } else {
      // Trim and limit to 100 characters (emojis are multi-byte, but that's fine)
      updates.presenceStatus = args.presenceStatus.trim().slice(0, 100);
    }

    await ctx.db.patch(profile._id, updates);
    return await ctx.db.get(profile._id);
  },
});

// Search users by username or email
export const search = query({
  args: { 
    query: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.query || args.query.length < 2) return [];
    
    const searchLower = args.query.toLowerCase();
    
    // Get all profiles and filter (in production, use a proper search index)
    const allProfiles = await ctx.db.query("profiles").collect();
    
    const results = allProfiles
      .filter((profile) => {
        // Exclude current user
        if (args.userId && profile.userId === args.userId) return false;
        
        const nameMatch = profile.name.toLowerCase().includes(searchLower);
        const globalNameMatch = profile.globalName?.toLowerCase().includes(searchLower);
        const emailMatch = profile.email.toLowerCase().includes(searchLower);
        
        return nameMatch || globalNameMatch || emailMatch;
      })
      .slice(0, 20); // Limit results
    
    return results;
  },
});
