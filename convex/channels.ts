import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

// Get channel by ID
export const getById = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.channelId);
  },
});

// Get channels for a server
export const getByServer = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();
  },
});

// Create channel
export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("TEXT"), v.literal("AUDIO"), v.literal("VIDEO")),
    serverId: v.id("servers"),
    categoryId: v.optional(v.id("categories")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    if (args.name === "general") {
      throw new Error('Name cannot be "general"');
    }

    // Check if user is admin or moderator
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q) =>
        q.eq("profileId", profile._id).eq("serverId", args.serverId)
      )
      .first();

    if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const channelId = await ctx.db.insert("channels", {
      name: args.name,
      type: args.type,
      profileId: profile._id,
      serverId: args.serverId,
      categoryId: args.categoryId,
      position: 1, // TODO: Calculate proper position
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(channelId);
  },
});

// Update channel
export const update = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("TEXT"), v.literal("AUDIO"), v.literal("VIDEO"))),
    position: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check if user is admin or moderator
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q) =>
        q.eq("profileId", profile._id).eq("serverId", channel.serverId)
      )
      .first();

    if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
      throw new Error("Unauthorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.position !== undefined) updates.position = args.position;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;

    await ctx.db.patch(args.channelId, updates);
    return await ctx.db.get(args.channelId);
  },
});

// Delete channel
export const remove = mutation({
  args: { 
    channelId: v.id("channels"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check if user is admin or moderator
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q) =>
        q.eq("profileId", profile._id).eq("serverId", channel.serverId)
      )
      .first();

    if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
      throw new Error("Unauthorized");
    }

    // Delete related messages and attachments
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
      .collect();

    for (const message of messages) {
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
        .collect();
      
      for (const attachment of attachments) {
        await ctx.db.delete(attachment._id);
      }
      
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.channelId);
    return { success: true };
  },
});

