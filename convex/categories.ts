import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

export const getById = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.categoryId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    serverId: v.id("servers"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    // Check if user is a member of the server
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q) =>
        q.eq("profileId", profile._id).eq("serverId", args.serverId)
      )
      .first();

    if (!member) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin or moderator
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    const isOwner = server.profileId === profile._id;
    const isAdmin = member.role === "ADMIN";
    const isModerator = member.role === "MODERATOR";

    if (!isOwner && !isAdmin && !isModerator) {
      throw new Error("Unauthorized");
    }

    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      serverId: args.serverId,
    });

    return await ctx.db.get(categoryId);
  },
});