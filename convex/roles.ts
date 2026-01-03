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
    
    const roleId = await ctx.db.insert("roles", {
      serverId: args.serverId,
      name: args.name,
      color: args.color,
      permissions: args.permissions,
      position: args.position,
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
    if (args.mentionable !== undefined) updates.mentionable = args.mentionable;
    if (args.hoist !== undefined) updates.hoist = args.hoist;
    
    await ctx.db.patch(args.roleId, updates);
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

