import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentProfile, requireProfile } from "./lib/helpers";
import { PERMISSIONS } from "../lib/permissions";

// Get all roles for a server
export const getByServerId = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_serverId", (q: any) => q.eq("serverId", args.serverId))
      .collect();
    
    return roles.sort((a, b) => a.position - b.position);
  },
});

// Get a role by ID
export const getById = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roleId);
  },
});

// Create a new role
export const create = mutation({
  args: {
    serverId: v.id("servers"),
    name: v.string(),
    color: v.optional(v.string()),
    permissions: v.array(v.string()),
    position: v.number(),
    index: v.optional(v.number()),
    mentionable: v.boolean(),
    hoist: v.boolean(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    // Check if user has MANAGE_ROLES permission
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q: any) =>
        q.eq("profileId", profile._id).eq("serverId", args.serverId)
      )
      .first();
    
    if (!member) {
      throw new Error("Member not found");
    }
    
    // Check permissions (simplified - in production, check actual permissions)
    if (member.role !== "ADMIN" && !member.roleId) {
      throw new Error("Insufficient permissions");
    }
    
    // If index not provided, set it to the max index + 1 for hoisted roles, or 0 for non-hoisted
    let index = args.index;
    if (index === undefined) {
      const allRoles = await ctx.db
        .query("roles")
        .withIndex("by_serverId", (q: any) => q.eq("serverId", args.serverId))
        .collect();
      const hoistedRoles = allRoles.filter((r) => r.hoist && r.index !== undefined);
      if (args.hoist && hoistedRoles.length > 0) {
        const maxIndex = Math.max(...hoistedRoles.map((r) => r.index || 0));
        index = maxIndex + 1;
      } else if (args.hoist) {
        index = 0;
      } else {
        index = undefined; // Non-hoisted roles don't need an index
      }
    }
    
    const roleId = await ctx.db.insert("roles", {
      serverId: args.serverId,
      name: args.name,
      color: args.color,
      permissions: args.permissions,
      position: args.position,
      index: index,
      mentionable: args.mentionable ?? false,
      hoist: args.hoist ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(roleId);
  },
});

// Update a role
export const update = mutation({
  args: {
    roleId: v.id("roles"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    position: v.optional(v.number()),
    index: v.optional(v.number()),
    mentionable: v.optional(v.boolean()),
    hoist: v.optional(v.boolean()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const role = await ctx.db.get(args.roleId);
    
    if (!role) {
      throw new Error("Role not found");
    }
    
    // Check permissions
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q: any) =>
        q.eq("profileId", profile._id).eq("serverId", role.serverId)
      )
      .first();
    
    if (!member || (member.role !== "ADMIN" && !member.roleId)) {
      throw new Error("Insufficient permissions");
    }
    
    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;
    if (args.permissions !== undefined) updates.permissions = args.permissions;
    if (args.position !== undefined) updates.position = args.position;
    if (args.index !== undefined) updates.index = args.index;
    if (args.mentionable !== undefined) updates.mentionable = args.mentionable;
    if (args.hoist !== undefined) updates.hoist = args.hoist;
    
    await ctx.db.patch(args.roleId, updates);
    return await ctx.db.get(args.roleId);
  },
});

// Move a role up in the hierarchy (decrease index)
export const moveUp = mutation({
  args: {
    roleId: v.id("roles"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const role = await ctx.db.get(args.roleId);
    
    if (!role) {
      throw new Error("Role not found");
    }
    
    // Check permissions
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q: any) =>
        q.eq("profileId", profile._id).eq("serverId", role.serverId)
      )
      .first();
    
    if (!member || (member.role !== "ADMIN" && !member.roleId)) {
      throw new Error("Insufficient permissions");
    }
    
    // Only move hoisted roles with an index
    if (!role.hoist || role.index === undefined) {
      throw new Error("Can only reorder hoisted roles that have an index");
    }
    
    // Get all hoisted roles for this server, sorted by index
    const allRoles = await ctx.db
      .query("roles")
      .withIndex("by_serverId", (q: any) => q.eq("serverId", role.serverId))
      .collect();
    
    const hoistedRoles = allRoles
      .filter((r) => r.hoist && r.index !== undefined)
      .sort((a, b) => (a.index || 0) - (b.index || 0));
    
    const currentIndex = hoistedRoles.findIndex((r) => r._id === args.roleId);
    
    if (currentIndex <= 0) {
      // Already at the top
      return await ctx.db.get(args.roleId);
    }
    
    // Swap with the role above
    const roleAbove = hoistedRoles[currentIndex - 1];
    const currentIndexValue = role.index || 0;
    const aboveIndexValue = roleAbove.index || 0;
    
    await ctx.db.patch(args.roleId, {
      index: aboveIndexValue,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(roleAbove._id, {
      index: currentIndexValue,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.roleId);
  },
});

// Move a role down in the hierarchy (increase index)
export const moveDown = mutation({
  args: {
    roleId: v.id("roles"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const role = await ctx.db.get(args.roleId);
    
    if (!role) {
      throw new Error("Role not found");
    }
    
    // Check permissions
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q: any) =>
        q.eq("profileId", profile._id).eq("serverId", role.serverId)
      )
      .first();
    
    if (!member || (member.role !== "ADMIN" && !member.roleId)) {
      throw new Error("Insufficient permissions");
    }
    
    // Only move hoisted roles with an index
    if (!role.hoist || role.index === undefined) {
      throw new Error("Can only reorder hoisted roles that have an index");
    }
    
    // Get all hoisted roles for this server, sorted by index
    const allRoles = await ctx.db
      .query("roles")
      .withIndex("by_serverId", (q: any) => q.eq("serverId", role.serverId))
      .collect();
    
    const hoistedRoles = allRoles
      .filter((r) => r.hoist && r.index !== undefined)
      .sort((a, b) => (a.index || 0) - (b.index || 0));
    
    const currentIndex = hoistedRoles.findIndex((r) => r._id === args.roleId);
    
    if (currentIndex >= hoistedRoles.length - 1) {
      // Already at the bottom
      return await ctx.db.get(args.roleId);
    }
    
    // Swap with the role below
    const roleBelow = hoistedRoles[currentIndex + 1];
    const currentIndexValue = role.index || 0;
    const belowIndexValue = roleBelow.index || 0;
    
    await ctx.db.patch(args.roleId, {
      index: belowIndexValue,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(roleBelow._id, {
      index: currentIndexValue,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.roleId);
  },
});

// Delete a role
export const remove = mutation({
  args: {
    roleId: v.id("roles"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const role = await ctx.db.get(args.roleId);
    
    if (!role) {
      throw new Error("Role not found");
    }
    
    // Check permissions
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q: any) =>
        q.eq("profileId", profile._id).eq("serverId", role.serverId)
      )
      .first();
    
    if (!member || (member.role !== "ADMIN" && !member.roleId)) {
      throw new Error("Insufficient permissions");
    }
    
    // Remove role from all members (handle both new roleIds array and legacy roleId)
    const membersWithRole = await ctx.db
      .query("members")
      .withIndex("by_roleId", (q: any) => q.eq("roleId", args.roleId))
      .collect();
    
    // Also get members that have this role in their roleIds array
    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_serverId", (q: any) => q.eq("serverId", role.serverId))
      .collect();
    
    for (const member of allMembers) {
      const roleIds = member.roleIds || (member.roleId ? [member.roleId] : []);
      if (roleIds.includes(args.roleId)) {
        const newRoleIds = roleIds.filter((id) => id !== args.roleId);
        await ctx.db.patch(member._id, {
          roleIds: newRoleIds.length > 0 ? newRoleIds : undefined,
          roleId: newRoleIds.length > 0 ? (newRoleIds[0] as any) : undefined,
        });
      }
    }
    
    await ctx.db.delete(args.roleId);
  },
});

// Check if a member has a specific permission
export const hasPermission = query({
  args: {
    memberId: v.id("members"),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) return false;
    
    // Admin always has all permissions
    if (member.role === "ADMIN") return true;
    
    // Check role permissions (support both new roleIds array and legacy roleId)
    const roleIds = member.roleIds || (member.roleId ? [member.roleId] : []);
    for (const roleId of roleIds) {
      const role = await ctx.db.get(roleId);
      if (role && role.permissions.includes(PERMISSIONS.ADMINISTRATOR)) {
        return true;
      }
      if (role && role.permissions.includes(args.permission)) {
        return true;
      }
    }
    
    // Check legacy role permissions
    if (member.role === "MODERATOR") {
      // Moderators have some permissions by default
      const moderatorPermissions = [
        PERMISSIONS.MANAGE_MESSAGES,
        PERMISSIONS.KICK_MEMBERS,
        PERMISSIONS.MANAGE_CHANNELS,
      ];
      return moderatorPermissions.includes(args.permission as any);
    }
    
    return false;
  },
});

