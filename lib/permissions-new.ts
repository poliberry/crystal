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
