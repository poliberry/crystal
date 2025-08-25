import { db } from "@/lib/db";
import { PermissionType, PermissionScope, PermissionGrantType } from "@prisma/client";

export interface SimplePermissionResult {
  granted: boolean;
  reason: 'ADMIN' | 'LEGACY_ADMIN' | 'ROLE' | 'USER_OVERRIDE' | 'DENIED';
  source?: string;
}

export interface MemberData {
  id: string;
  profileId: string;
  serverId: string;
  role?: string; // Legacy role field
  memberRoles: {
    role: {
      id: string;
      name: string;
      position: number;
      permissions: {
        permission: PermissionType;
        grant: PermissionGrantType;
        scope: PermissionScope;
        targetId: string | null;
      }[];
    };
  }[];
  userPermissions: {
    permission: PermissionType;
    grant: PermissionGrantType;
    scope: PermissionScope;
    targetId: string | null;
  }[];
}

/**
 * Simplified, robust permission system
 */
export class SimplePermissions {
  
  /**
   * Check if a member has a specific permission
   */
  static async hasPermission(
    memberId: string,
    permission: PermissionType,
    scope: PermissionScope = PermissionScope.SERVER,
    targetId?: string
  ): Promise<SimplePermissionResult> {
    try {
      console.log('[SIMPLE_PERMISSIONS] Checking permission:', { memberId, permission, scope, targetId });
      
      // Get member data with all permissions
      const member = await this.getMemberData(memberId);
      if (!member) {
        console.log('[SIMPLE_PERMISSIONS] Member not found:', memberId);
        return { granted: false, reason: 'DENIED' };
      }

      console.log('[SIMPLE_PERMISSIONS] Member data:', {
        id: member.id,
        role: member.role,
        rolesCount: member.memberRoles.length,
        userPermissionsCount: member.userPermissions.length
      });

      // 1. Check legacy admin role (highest priority)
      if (member.role === 'ADMIN') {
        console.log('[SIMPLE_PERMISSIONS] Legacy admin granted');
        return { granted: true, reason: 'LEGACY_ADMIN' };
      }

      // 2. Check if user has ADMINISTRATOR permission (grants everything)
      const isAdmin = await this.isAdministrator(member);
      console.log('[SIMPLE_PERMISSIONS] Is administrator:', isAdmin);
      if (isAdmin) {
        return { granted: true, reason: 'ADMIN' };
      }

      // 3. Check user-specific overrides (high priority)
      const userOverride = this.checkUserOverride(member, permission, scope, targetId);
      if (userOverride) {
        console.log('[SIMPLE_PERMISSIONS] User override found:', userOverride);
        return userOverride;
      }

      // 4. Check role permissions (medium priority)
      const roleResult = this.checkRolePermissions(member, permission, scope, targetId);
      console.log('[SIMPLE_PERMISSIONS] Role result:', roleResult);
      if (roleResult.granted) {
        return roleResult;
      }

      // 5. Default deny
      console.log('[SIMPLE_PERMISSIONS] Default deny');
      return { granted: false, reason: 'DENIED' };

    } catch (error) {
      console.error('[SIMPLE_PERMISSIONS] Error checking permission:', error);
      return { granted: false, reason: 'DENIED' };
    }
  }

  /**
   * Check multiple permissions at once
   */
  static async hasPermissions(
    memberId: string,
    permissions: Array<{
      permission: PermissionType;
      scope?: PermissionScope;
      targetId?: string;
    }>
  ): Promise<Array<SimplePermissionResult & { permission: PermissionType; scope: PermissionScope; targetId?: string }>> {
    const results = [];
    
    for (const perm of permissions) {
      const result = await this.hasPermission(
        memberId,
        perm.permission,
        perm.scope || PermissionScope.SERVER,
        perm.targetId
      );
      
      results.push({
        ...result,
        permission: perm.permission,
        scope: perm.scope || PermissionScope.SERVER,
        targetId: perm.targetId
      });
    }
    
    return results;
  }

  /**
   * Get all effective permissions for a member
   */
  static async getEffectivePermissions(
    memberId: string,
    scope: PermissionScope = PermissionScope.SERVER,
    targetId?: string
  ): Promise<PermissionType[]> {
    try {
      const member = await this.getMemberData(memberId);
      if (!member) return [];

      // If legacy admin or has ADMINISTRATOR permission, return all permissions
      if (member.role === 'ADMIN' || await this.isAdministrator(member)) {
        return Object.values(PermissionType);
      }

      const effectivePermissions: Set<PermissionType> = new Set();

      // Check each permission
      for (const permissionType of Object.values(PermissionType)) {
        const result = await this.hasPermission(memberId, permissionType, scope, targetId);
        if (result.granted) {
          effectivePermissions.add(permissionType);
        }
      }

      return Array.from(effectivePermissions);
    } catch (error) {
      console.error('[SIMPLE_PERMISSIONS] Error getting effective permissions:', error);
      return [];
    }
  }

  /**
   * Get member data with all permission-related information
   */
  private static async getMemberData(memberId: string): Promise<MemberData | null> {
    try {
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

      return member as MemberData | null;
    } catch (error) {
      console.error('[SIMPLE_PERMISSIONS] Error fetching member data:', error);
      return null;
    }
  }

  /**
   * Check if member is an administrator
   */
  private static async isAdministrator(member: MemberData): Promise<boolean> {
    console.log('[SIMPLE_PERMISSIONS] Checking administrator status for member:', member.id);
    console.log('[SIMPLE_PERMISSIONS] Member roles:', member.memberRoles.map(mr => ({
      roleId: mr.role.id,
      roleName: mr.role.name,
      permissionsCount: mr.role.permissions.length,
      permissions: mr.role.permissions.map(p => ({ permission: p.permission, grant: p.grant, scope: p.scope }))
    })));
    console.log('[SIMPLE_PERMISSIONS] User permissions:', member.userPermissions.map(p => ({ permission: p.permission, grant: p.grant, scope: p.scope })));
    
    // Check roles for ADMINISTRATOR permission
    for (const memberRole of member.memberRoles) {
      for (const perm of memberRole.role.permissions) {
        console.log('[SIMPLE_PERMISSIONS] Checking role permission:', {
          permission: perm.permission,
          grant: perm.grant,
          scope: perm.scope,
          isAdmin: perm.permission === PermissionType.ADMINISTRATOR,
          isAllow: perm.grant === PermissionGrantType.ALLOW,
          isServer: perm.scope === PermissionScope.SERVER
        });
        
        if (perm.permission === PermissionType.ADMINISTRATOR && 
            perm.grant === PermissionGrantType.ALLOW &&
            perm.scope === PermissionScope.SERVER) {
          console.log('[SIMPLE_PERMISSIONS] Found ADMINISTRATOR permission in role:', memberRole.role.name);
          return true;
        }
      }
    }

    // Check user overrides for ADMINISTRATOR permission
    for (const perm of member.userPermissions) {
      console.log('[SIMPLE_PERMISSIONS] Checking user permission:', {
        permission: perm.permission,
        grant: perm.grant,
        scope: perm.scope,
        isAdmin: perm.permission === PermissionType.ADMINISTRATOR,
        isAllow: perm.grant === PermissionGrantType.ALLOW,
        isServer: perm.scope === PermissionScope.SERVER
      });
      
      if (perm.permission === PermissionType.ADMINISTRATOR && 
          perm.grant === PermissionGrantType.ALLOW &&
          perm.scope === PermissionScope.SERVER) {
        console.log('[SIMPLE_PERMISSIONS] Found ADMINISTRATOR permission in user overrides');
        return true;
      }
    }

    console.log('[SIMPLE_PERMISSIONS] No ADMINISTRATOR permission found');
    return false;
  }

  /**
   * Check user-specific permission overrides
   */
  private static checkUserOverride(
    member: MemberData,
    permission: PermissionType,
    scope: PermissionScope,
    targetId?: string
  ): SimplePermissionResult | null {
    const normalizedTargetId = targetId || null;
    
    for (const perm of member.userPermissions) {
      if (perm.permission === permission && 
          perm.scope === scope && 
          perm.targetId === normalizedTargetId) {
        
        if (perm.grant === PermissionGrantType.ALLOW) {
          return { granted: true, reason: 'USER_OVERRIDE', source: 'user_override' };
        } else if (perm.grant === PermissionGrantType.DENY) {
          return { granted: false, reason: 'DENIED', source: 'user_override' };
        }
      }
    }

    return null;
  }

  /**
   * Check role-based permissions
   */
  private static checkRolePermissions(
    member: MemberData,
    permission: PermissionType,
    scope: PermissionScope,
    targetId?: string
  ): SimplePermissionResult {
    const normalizedTargetId = targetId || null;
    
    // Sort roles by position (highest first)
    const sortedRoles = [...member.memberRoles]
      .sort((a, b) => b.role.position - a.role.position);

    let hasAllow = false;
    let allowingRole: string | undefined;

    // Check for DENY first (highest priority within roles)
    for (const memberRole of sortedRoles) {
      for (const perm of memberRole.role.permissions) {
        if (perm.permission === permission && 
            perm.scope === scope && 
            perm.targetId === normalizedTargetId) {
          
          if (perm.grant === PermissionGrantType.DENY) {
            return { 
              granted: false, 
              reason: 'DENIED', 
              source: memberRole.role.id 
            };
          } else if (perm.grant === PermissionGrantType.ALLOW) {
            hasAllow = true;
            allowingRole = memberRole.role.id;
          }
        }
      }
    }

    if (hasAllow) {
      return { 
        granted: true, 
        reason: 'ROLE', 
        source: allowingRole 
      };
    }

    return { granted: false, reason: 'DENIED' };
  }

  /**
   * Helper method to grant administrator permission to a member
   */
  static async grantAdminPermission(memberId: string, assignedBy: string): Promise<void> {
    try {
      await db.userPermission.upsert({
        where: {
          memberId_permission_scope_targetId: {
            memberId,
            permission: PermissionType.ADMINISTRATOR,
            scope: PermissionScope.SERVER,
            targetId: ""
          }
        },
        update: {
          grant: PermissionGrantType.ALLOW,
          assignedBy
        },
        create: {
          memberId,
          permission: PermissionType.ADMINISTRATOR,
          scope: PermissionScope.SERVER,
          targetId: null,
          grant: PermissionGrantType.ALLOW,
          assignedBy
        }
      });
    } catch (error) {
      console.error('[SIMPLE_PERMISSIONS] Error granting admin permission:', error);
      throw error;
    }
  }

  /**
   * Helper method to revoke administrator permission from a member
   */
  static async revokeAdminPermission(memberId: string): Promise<void> {
    try {
      await db.userPermission.deleteMany({
        where: {
          memberId,
          permission: PermissionType.ADMINISTRATOR,
          scope: PermissionScope.SERVER
        }
      });
    } catch (error) {
      console.error('[SIMPLE_PERMISSIONS] Error revoking admin permission:', error);
      throw error;
    }
  }

  /**
   * Helper method to check if a member can manage another member
   */
  static async canManageMember(actorMemberId: string, targetMemberId: string): Promise<boolean> {
    try {
      if (actorMemberId === targetMemberId) return false;

      const [actor, target] = await Promise.all([
        this.getMemberData(actorMemberId),
        this.getMemberData(targetMemberId)
      ]);

      if (!actor || !target) return false;

      // Legacy admin can manage anyone except other legacy admins
      if (actor.role === 'ADMIN') {
        return target.role !== 'ADMIN';
      }

      // Administrator can manage anyone except other administrators
      if (await this.isAdministrator(actor)) {
        return !(await this.isAdministrator(target));
      }

      // Check if actor has permission to manage members
      const canManage = await this.hasPermission(actorMemberId, PermissionType.MANAGE_ROLES);
      if (!canManage.granted) return false;

      // Check role hierarchy
      const actorHighestRole = Math.max(...actor.memberRoles.map(mr => mr.role.position), 0);
      const targetHighestRole = Math.max(...target.memberRoles.map(mr => mr.role.position), 0);

      return actorHighestRole > targetHighestRole;
    } catch (error) {
      console.error('[SIMPLE_PERMISSIONS] Error checking management permission:', error);
      return false;
    }
  }
}
