import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentProfile, requireProfile } from "./lib/helpers";

// Get current user's customisation settings
export const getCurrent = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    
    const profile = await getCurrentProfile(ctx, args.userId);
    if (!profile) return null;

    const customisation = await ctx.db
      .query("userCustomisation")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .first();

    return customisation;
  },
});

// Get customisation by profileId
export const getByProfileId = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userCustomisation")
      .withIndex("by_profileId", (q) => q.eq("profileId", args.profileId))
      .first();
  },
});

// Get or create customisation for current user
const getOrCreateCustomisation = async (
  ctx: any,
  userId: string,
  profileId: any
) => {
  let customisation = await ctx.db
    .query("userCustomisation")
    .withIndex("by_profileId", (q: any) => q.eq("profileId", profileId))
    .first();

  if (!customisation) {
    const now = Date.now();
    const customisationId = await ctx.db.insert("userCustomisation", {
      profileId,
      userId,
      chatMode: "DEFAULT",
      createdAt: now,
      updatedAt: now,
    });
    const newCustomisation = await ctx.db.get(customisationId);
    if (!newCustomisation) {
      throw new Error("Failed to create customisation");
    }
    return newCustomisation;
  }

  return customisation;
};

// Update customisation
export const update = mutation({
  args: {
    userId: v.optional(v.string()),
    chatMode: v.optional(v.union(v.literal("DEFAULT"), v.literal("IRC"))),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    let customisation = await ctx.db
      .query("userCustomisation")
      .withIndex("by_profileId", (q: any) => q.eq("profileId", profile._id))
      .first();

    if (!customisation) {
      // Create if it doesn't exist
      customisation = await getOrCreateCustomisation(
        ctx,
        args.userId || "",
        profile._id
      );
    }

    if (!customisation) {
      throw new Error("Failed to get or create customisation");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.chatMode !== undefined) updates.chatMode = args.chatMode;

    await ctx.db.patch(customisation._id, updates);
    return await ctx.db.get(customisation._id);
  },
});

