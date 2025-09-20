import { db } from "@/lib/db";
import { SimpleRolePermissions } from "@/lib/simple-role-permissions";
import { 
  PermissionType, 
  PermissionScope, 
  PermissionGrantType, 
  PermissionCheckResult
} from "@/types/permissions";

/**
 * Simple permission checking utility
 */
export class PermissionManager {
  
  /**
   * Check if a member has a specific permission in a given context
   */
  static async hasPermission(
    memberId: string,
    permission: PermissionType,
    scope: PermissionScope = PermissionScope.SERVER,
    targetId?: string
  ): Promise<PermissionCheckResult> {
    
    // Use our simple role-based permission system
    const result = await SimpleRolePermissions.hasPermission(memberId, permission, targetId);
    
    return {
      granted: result.granted,
      reason: result.granted ? 'ROLE' : 'DENIED',
      source: result.reason
    };
  }

  /**
   * Check if a member can moderate another member
   */
  static async canModerateUser(
    actorMemberId: string,
    targetMemberId: string,
    action: 'KICK' | 'BAN' | 'TIMEOUT' | 'MANAGE_ROLES'
  ): Promise<boolean> {
    // Simple check - if actor is server owner or admin, allow
    const member = await db.member.findFirst({ where: { id: actorMemberId } });
    if (!member) return false;

    const server = await db.server.findFirst({ where: { id: member.serverId } });
    if (server && member.profileId === server.profileId) return true;

    if (member.role === 'ADMIN') return true;

    return false;
  }
}
  }

  /**
   * Get member with all permission-related data
   */
  static async getMemberWithPermissions(memberId: string): Promise<MemberWithPermissions | null> {
    const member = await db.member.findUnique({
      where: { id: memberId },
      include: {
        memberRoles: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        },
        userPermissions: true
      }
    });

    if (!member) return null;

    // Transform to our interface
    return {
      id: member.id,
      profileId: member.profileId,
      roles: member.memberRoles.map((mra: any) => ({
        id: mra.role.id,
        name: mra.role.name,
        color: mra.role.color,
        position: mra.role.position,
        hoisted: mra.role.hoisted,
        mentionable: mra.role.mentionable,
        permissions: mra.role.permissions.map((p: any) => ({
          permission: p.permission as PermissionType,
          grant: p.grant as PermissionGrantType,
          scope: p.scope as PermissionScope,
          targetId: p.targetId
        }))
      })),
      userPermissions: member.userPermissions.map((up: any) => ({
        permission: up.permission as PermissionType,
        grant: up.grant as PermissionGrantType,
        scope: up.scope as PermissionScope,
        targetId: up.targetId
      }))
    };
  }

  /**
   * Check if member has administrator permission
   */
  private static hasAdministratorPermission(member: MemberWithPermissions): boolean {
    // Check roles for administrator permission
    for (const role of member.roles) {
      for (const perm of role.permissions) {
        if (perm.permission === PermissionType.ADMINISTRATOR && 
            perm.grant === PermissionGrantType.ALLOW) {
          return true;
        }
      }
    }

    // Check user overrides for administrator permission
    for (const perm of member.userPermissions) {
      if (perm.permission === PermissionType.ADMINISTRATOR && 
          perm.grant === PermissionGrantType.ALLOW) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get user-specific permission override
   */
  private static getUserPermissionOverride(
    member: MemberWithPermissions,
    permission: PermissionType,
    scope: PermissionScope,
    targetId?: string
  ): PermissionOverride | null {
    return member.userPermissions.find((up: PermissionOverride) => 
      up.permission === permission && 
      up.scope === scope && 
      up.targetId === targetId
    ) || null;
  }

  /**
   * Check role-based permissions
   */
  private static checkRolePermissions(
    member: MemberWithPermissions,
    permission: PermissionType,
    scope: PermissionScope,
    targetId?: string
  ): PermissionCheckResult {
    // Sort roles by position (highest first)
    const sortedRoles = [...member.roles].sort((a, b) => b.position - a.position);

    let hasAllow = false;
    let allowingRole: string | undefined;

    for (const role of sortedRoles) {
      for (const perm of role.permissions) {
        if (perm.permission === permission && 
            perm.scope === scope && 
            perm.targetId === targetId) {
          
          if (perm.grant === PermissionGrantType.DENY) {
            return { granted: false, reason: 'DENIED', source: role.id };
          } else if (perm.grant === PermissionGrantType.ALLOW) {
            hasAllow = true;
            allowingRole = role.id;
          }
        }
      }
    }

    if (hasAllow) {
      return { granted: true, reason: 'ROLE', source: allowingRole };
    }

    return { granted: false, reason: 'DENIED' };
  }

  /**
   * Get effective permissions for a member in a specific context
   */
  static async getEffectivePermissions(
    memberId: string,
    scope: PermissionScope = PermissionScope.SERVER,
    targetId?: string
  ): Promise<PermissionType[]> {
    const member = await this.getMemberWithPermissions(memberId);
    if (!member) return [];

    const effectivePermissions: Set<PermissionType> = new Set();

    // If administrator, add all permissions
    if (this.hasAdministratorPermission(member)) {
      return Object.values(PermissionType);
    }

    // Check each permission type
    for (const permissionType of Object.values(PermissionType)) {
      const result = await this.hasPermission(memberId, permissionType, scope, targetId);
      if (result.granted) {
        effectivePermissions.add(permissionType);
      }
    }

    return Array.from(effectivePermissions);
  }

  /**
   * Create a new role with permissions
   */
  static async createRole(
    serverId: string,
    name: string,
    permissions: PermissionOverride[],
    options: {
      color?: string;
      hoisted?: boolean;
      mentionable?: boolean;
      position?: number;
    } = {}
  ): Promise<RoleWithPermissions> {
    const role = await db.role.create({
      data: {
        name,
        serverId,
        color: options.color,
        hoisted: options.hoisted || false,
        mentionable: options.mentionable || false,
        position: options.position || 0,
        permissions: {
          create: permissions.map(p => ({
            permission: p.permission,
            scope: p.scope,
            grant: p.grant,
            targetId: p.targetId
          }))
        }
      },
      include: {
        permissions: true
      }
    });

    return {
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
      hoisted: role.hoisted,
      mentionable: role.mentionable,
      permissions: role.permissions.map((p: any) => ({
        permission: p.permission as PermissionType,
        grant: p.grant as PermissionGrantType,
        scope: p.scope as PermissionScope,
        targetId: p.targetId
      }))
    };
  }

  /**
   * Assign role to member
   */
  static async assignRole(
    memberId: string,
    roleId: string,
    assignedBy: string
  ): Promise<void> {
    await db.memberRoleAssignment.create({
      data: {
        memberId,
        roleId,
        assignedBy
      }
    });

    // Log the action
    await this.logPermissionAction(
      memberId,
      'ROLE_ASSIGNED',
      'MEMBER',
      memberId,
      assignedBy,
      `Role ${roleId} assigned to member`
    );
  }

  /**
   * Remove role from member
   */
  static async removeRole(
    memberId: string,
    roleId: string,
    removedBy: string
  ): Promise<void> {
    await db.memberRoleAssignment.deleteMany({
      where: {
        memberId,
        roleId
      }
    });

    // Log the action
    await this.logPermissionAction(
      memberId,
      'ROLE_REMOVED',
      'MEMBER',
      memberId,
      removedBy,
      `Role ${roleId} removed from member`
    );
  }

  /**
   * Set user-specific permission override
   */
  static async setUserPermission(
    memberId: string,
    permission: PermissionType,
    grant: PermissionGrantType,
    assignedBy: string,
    scope: PermissionScope = PermissionScope.SERVER,
    targetId?: string,
    reason?: string,
    expiresAt?: Date
  ): Promise<void> {
    await db.userPermission.upsert({
      where: {
        memberId_permission_scope_targetId: {
          memberId,
          permission,
          scope,
          targetId: targetId || ""
        }
      },
      update: {
        grant,
        reason,
        assignedBy,
        expiresAt
      },
      create: {
        memberId,
        permission,
        grant,
        scope,
        targetId,
        reason,
        assignedBy,
        expiresAt
      }
    });

    // Get member's server for logging
    const member = await db.member.findUnique({
      where: { id: memberId },
      select: { serverId: true }
    });

    if (member) {
      await this.logPermissionAction(
        member.serverId,
        'USER_PERMISSION_SET',
        'MEMBER',
        memberId,
        assignedBy,
        reason,
        permission
      );
    }
  }

  /**
   * Set channel permission override
   */
  static async setChannelPermission(
    channelId: string,
    permission: PermissionType,
    grant: PermissionGrantType,
    roleId?: string,
    memberId?: string
  ): Promise<void> {
    await db.channelPermission.upsert({
      where: {
        channelId_roleId_memberId_permission: {
          channelId,
          roleId: roleId || "",
          memberId: memberId || "",
          permission
        }
      },
      update: {
        grant
      },
      create: {
        channelId,
        roleId,
        memberId,
        permission,
        grant
      }
    });
  }

  /**
   * Log permission-related actions for audit
   */
  private static async logPermissionAction(
    serverId: string,
    action: string,
    targetType: string,
    targetId: string,
    performedBy: string,
    reason?: string,
    permission?: PermissionType,
    oldValue?: any,
    newValue?: any
  ): Promise<void> {
    await db.permissionAuditLog.create({
      data: {
        serverId,
        action,
        targetType,
        targetId,
        permission,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        performedBy,
        reason
      }
    });
  }

  /**
   * Check if member can perform action on target
   */
  static async canManageTarget(
    actorMemberId: string,
    targetMemberId: string,
    action: 'KICK' | 'BAN' | 'TIMEOUT' | 'MANAGE_ROLES'
  ): Promise<boolean> {
    const [actor, target] = await Promise.all([
      this.getMemberWithPermissions(actorMemberId),
      this.getMemberWithPermissions(targetMemberId)
    ]);

    if (!actor || !target) return false;

    // Can't manage yourself
    if (actorMemberId === targetMemberId) return false;

    // Administrator can manage anyone except other administrators
    if (this.hasAdministratorPermission(actor)) {
      return !this.hasAdministratorPermission(target);
    }

    // Get highest role positions
    const actorHighestRole = Math.max(...actor.roles.map((r: RoleWithPermissions) => r.position), 0);
    const targetHighestRole = Math.max(...target.roles.map((r: RoleWithPermissions) => r.position), 0);

    // Must have higher role position
    if (actorHighestRole <= targetHighestRole) return false;

    // Check specific permission
    const permissionMap = {
      KICK: PermissionType.KICK_MEMBERS,
      BAN: PermissionType.BAN_MEMBERS,
      TIMEOUT: PermissionType.TIMEOUT_MEMBERS,
      MANAGE_ROLES: PermissionType.MANAGE_ROLES
    };

    const requiredPermission = permissionMap[action];
    const result = await this.hasPermission(actorMemberId, requiredPermission);
    
    return result.granted;
  }

  /**
   * Check if a member is the server owner
   */
  static async isServerOwner(memberId: string, serverId?: string): Promise<boolean> {
    try {
      // Get the member to find their profileId and serverId
      const member = await db.member.findUnique({
        where: { id: memberId },
        select: { profileId: true, serverId: true }
      });

      if (!member) return false;

      // Use the member's serverId if not provided
      const targetServerId = serverId || member.serverId;

      // Get the server to check its owner (profileId)
      const server = await db.server.findUnique({
        where: { id: targetServerId },
        select: { profileId: true }
      });

      if (!server) return false;

      // Check if the member's profileId matches the server's profileId (owner)
      return member.profileId === server.profileId;
    } catch (error) {
      console.error('Error checking server ownership:', error);
      return false;
    }
  }
}
