import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

// Get all servers - used for Crystal Console in SF
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("servers").collect();
  },
});

// Get server by ID
export const getById = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) return null;

    const members = await ctx.db
      .query("members")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();

    // Populate profile data for each member
    const membersWithProfiles = await Promise.all(
      members.map(async (member) => {
        const profile = await ctx.db.get(member.profileId);
        return {
          ...member,
          profile: profile || null,
        };
      }),
    );

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();

    return {
      ...server,
      members: membersWithProfiles,
      channels,
      categories,
    };
  },
});

// Get servers for current user
export const getMyServers = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    const members = await ctx.db
      .query("members")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    const serverIds = members.map((m) => m.serverId);
    const servers = await Promise.all(serverIds.map((id) => ctx.db.get(id)));

    return servers.filter(Boolean);
  },
});

// Create server
export const create = mutation({
  args: {
    name: v.string(),
    imageUrl: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    const now = Date.now();
    const inviteCode = crypto.randomUUID();

    // Create server
    const serverId = await ctx.db.insert("servers", {
      name: args.name,
      imageUrl: args.imageUrl,
      inviteCode,
      profileId: profile._id,
      createdAt: now,
      updatedAt: now,
    });

    // Create admin member
    await ctx.db.insert("members", {
      role: "ADMIN",
      profileId: profile._id,
      serverId,
      createdAt: now,
      updatedAt: now,
    });

    // Create default category and channel
    const categoryId = await ctx.db.insert("categories", {
      name: "Text Channels",
      serverId,
    });

    await ctx.db.insert("channels", {
      name: "general",
      type: "TEXT",
      profileId: profile._id,
      serverId,
      categoryId,
      position: 1,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(serverId);
  },
});

// Update server
export const update = mutation({
  args: {
    serverId: v.id("servers"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Check if user is the owner
    if (server.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.bannerUrl !== undefined) updates.bannerUrl = args.bannerUrl;

    await ctx.db.patch(args.serverId, updates);
    return await ctx.db.get(args.serverId);
  },
});

// Regenerate invite code
export const regenerateInviteCode = mutation({
  args: {
    serverId: v.id("servers"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Check if user is the owner
    if (server.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    const newInviteCode = crypto.randomUUID();
    await ctx.db.patch(args.serverId, {
      inviteCode: newInviteCode,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.serverId);
  },
});

// Leave server (remove member)
export const leave = mutation({
  args: {
    serverId: v.id("servers"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Don't allow owner to leave
    if (server.profileId === profile._id) {
      throw new Error("Server owner cannot leave their own server");
    }

    // Find and remove member
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q) =>
        q.eq("profileId", profile._id).eq("serverId", args.serverId),
      )
      .first();

    if (!member) {
      throw new Error("Not a member of this server");
    }

    await ctx.db.delete(member._id);
    return { success: true };
  },
});

// Delete server
export const remove = mutation({
  args: {
    serverId: v.id("servers"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Check if user is the owner
    if (server.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    // Delete related data (Convex will handle cascading deletes via indexes)
    const members = await ctx.db
      .query("members")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();

    for (const channel of channels) {
      await ctx.db.delete(channel._id);
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
      .collect();

    for (const category of categories) {
      await ctx.db.delete(category._id);
    }

    await ctx.db.delete(args.serverId);
    return { success: true };
  },
});

// Join server by invite code
export const joinByInviteCode = mutation({
  args: {
    inviteCode: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);

    // Find server by invite code
    const server = await ctx.db
      .query("servers")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!server) {
      throw new Error("Invalid invite code");
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q) =>
        q.eq("profileId", profile._id).eq("serverId", server._id),
      )
      .first();

    if (existingMember) {
      return server;
    }

    // Add user as a member
    const now = Date.now();
    await ctx.db.insert("members", {
      role: "GUEST",
      profileId: profile._id,
      serverId: server._id,
      createdAt: now,
      updatedAt: now,
    });

    return server;
  },
});
