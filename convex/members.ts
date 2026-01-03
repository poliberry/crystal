import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

// Get members for a server
export const getByServer = query({
  args: { 
    serverId: v.id("servers"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    // Check if user is a member of the server
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q: any) =>
        q.eq("profileId", profile._id).eq("serverId", args.serverId)
      )
      .first();

    if (!member) {
      throw new Error("Unauthorized");
    }

    const members = await ctx.db
      .query("members")
      .withIndex("by_serverId", (q: any) => q.eq("serverId", args.serverId))
      .collect();

    const membersWithProfiles = await Promise.all(
      members.map(async (m) => {
        const profileData = await ctx.db.get(m.profileId);
        // Get all roles for this member (support both new roleIds array and legacy roleId)
        const roleIds = m.roleIds || (m.roleId ? [m.roleId] : []);
        const roleData = await Promise.all(
          roleIds.map(async (roleId) => await ctx.db.get(roleId))
        );
        return {
          ...m,
          profile: profileData,
          roles: roleData.filter((r) => r !== null),
        };
      })
    );

    return membersWithProfiles;
  },
});

// Get available members for creating conversations (members from same servers)
export const getAvailable = query({
  args: { 
    memberId: v.id("members"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const member = await ctx.db.get(args.memberId);
    if (!member || member.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    // Get all servers this member is in
    const memberServers = await ctx.db
      .query("members")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    const serverIds = memberServers.map((m) => m.serverId);

    // Get all members from those servers
    const allMembers = await Promise.all(
      serverIds.map(async (serverId) => {
        return await ctx.db
          .query("members")
          .withIndex("by_serverId", (q) => q.eq("serverId", serverId))
          .collect();
      })
    );

    // Flatten and deduplicate by profileId
    const memberMap = new Map();
    for (const serverMembers of allMembers) {
      for (const m of serverMembers) {
        if (m.profileId !== profile._id && !memberMap.has(m.profileId)) {
          const profileData = await ctx.db.get(m.profileId);
          memberMap.set(m.profileId, {
            ...m,
            profile: profileData,
          });
        }
      }
    }

    return Array.from(memberMap.values());
  },
});

// Update member role
export const updateRole = mutation({
  args: {
    memberId: v.id("members"),
    serverId: v.id("servers"),
    role: v.union(v.literal("ADMIN"), v.literal("MODERATOR"), v.literal("GUEST")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    // Check if user is the server owner
    const server = await ctx.db.get(args.serverId);
    if (!server || server.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member || member.serverId !== args.serverId) {
      throw new Error("Member not found");
    }

    // Don't allow changing own role
    if (member.profileId === profile._id) {
      throw new Error("Cannot change your own role");
    }

    await ctx.db.patch(args.memberId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.memberId);
  },
});

// Toggle a role assignment for a member (add if not present, remove if present)
export const toggleRole = mutation({
  args: {
    memberId: v.id("members"),
    roleId: v.id("roles"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user has permission to manage roles
    const server = await ctx.db.get(member.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Check if user is server owner
    const isOwner = server.profileId === profile._id;
    
    // Check if user has MANAGE_ROLES permission
    const currentUserMember = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q: any) =>
        q.eq("profileId", profile._id).eq("serverId", member.serverId)
      )
      .first();

    if (!currentUserMember) {
      throw new Error("Unauthorized");
    }

    // Allow if owner, or if member has ADMIN role, or if member has a role with MANAGE_ROLES
    if (!isOwner && currentUserMember.role !== "ADMIN") {
      const currentUserRoleIds = currentUserMember.roleIds || (currentUserMember.roleId ? [currentUserMember.roleId] : []);
      let hasPermission = false;
      
      for (const roleId of currentUserRoleIds) {
        const userRole = await ctx.db.get(roleId);
        if (userRole && (userRole.permissions.includes("MANAGE_ROLES") || userRole.permissions.includes("ADMINISTRATOR"))) {
          hasPermission = true;
          break;
        }
      }
      
      if (!hasPermission) {
        throw new Error("Insufficient permissions");
      }
    }

    // Allow server owner to change their own role, but prevent others from changing their own role
    if (member.profileId === profile._id && !isOwner) {
      throw new Error("Cannot change your own role");
    }

    // Verify role belongs to the same server
    const role = await ctx.db.get(args.roleId);
    if (!role || role.serverId !== member.serverId) {
      throw new Error("Role not found or invalid");
    }

    // Get current role IDs (support both new roleIds array and legacy roleId)
    const currentRoleIds: any[] = member.roleIds || (member.roleId ? [member.roleId] : []);
    
    // Toggle the role: add if not present, remove if present
    let newRoleIds: any[];
    if (currentRoleIds.includes(args.roleId)) {
      newRoleIds = currentRoleIds.filter((id) => id !== args.roleId);
    } else {
      newRoleIds = [...currentRoleIds, args.roleId];
    }

    await ctx.db.patch(args.memberId, {
      roleIds: newRoleIds.length > 0 ? (newRoleIds as any) : undefined,
      // Keep legacy roleId for backward compatibility (use first role if exists)
      roleId: newRoleIds.length > 0 ? newRoleIds[0] : undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.memberId);
  },
});

// Remove member from server
export const remove = mutation({
  args: {
    memberId: v.id("members"),
    serverId: v.id("servers"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    // Check if user is the server owner
    const server = await ctx.db.get(args.serverId);
    if (!server || server.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member || member.serverId !== args.serverId) {
      throw new Error("Member not found");
    }

    // Don't allow removing yourself
    if (member.profileId === profile._id) {
      throw new Error("Cannot remove yourself");
    }

    await ctx.db.delete(args.memberId);
    return { success: true };
  },
});
