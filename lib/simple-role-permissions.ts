import { db } from "@/lib/db";

export interface SimplePermissionCheck {
  granted: boolean;
  reason: string;
}

/**
 * Simple role-based permission system
 */
export class SimpleRolePermissions {
  
  /**
   * Check if a member has a specific permission
   */
  static async hasPermission(
    memberId: string, 
    permission: string,
    serverId?: string
  ): Promise<SimplePermissionCheck> {
    try {
      // Get the member
      const member = await db.member.findFirst({
        where: { id: memberId }
      });

      if (!member) {
        return { granted: false, reason: 'Member not found' };
      }

      const targetServerId = serverId || member.serverId;

      // Check if member is server owner (gets all permissions)
      const server = await db.server.findFirst({
        where: { id: targetServerId }
      });

      if (server && member.profileId === server.profileId) {
        return { granted: true, reason: 'Server owner' };
      }

      // Get all roles for this server
      const serverRoles = await db.role.findMany({
        where: { serverId: targetServerId }
      });

      // Check each role's permissions
      for (const role of serverRoles) {
        const rolePermissions = await db.rolePermission.findMany({
          where: { roleId: role.id }
        });

        // Check if this role has the requested permission
        const hasPermission = rolePermissions.some((rp: any) => 
          rp.permission === permission && 
          rp.grantType === 'allow'
        );

        if (hasPermission) {
          // TODO: Check if member has this role assigned
          // For now, we'll check based on role name and member role
          if (this.memberHasRole(member, role)) {
            return { granted: true, reason: `Role: ${role.name}` };
          }
        }
      }

      return { granted: false, reason: 'No matching permissions found' };
      
    } catch (error) {
      console.error('Permission check error:', error);
      return { granted: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Check if member has a specific role
   * For now, this is a simple check based on role name and member role field
   */
  private static memberHasRole(member: any, role: any): boolean {
    // Server owner gets "Server Owner" role
    if (role.name === "Server Owner" && member.role === 'ADMIN') {
      return true;
    }
    
    // Everyone gets "@everyone" role
    if (role.name === "@everyone") {
      return true;
    }

    return false;
  }

  /**
   * Check if member can manage server
   */
  static async canManageServer(memberId: string, serverId?: string): Promise<boolean> {
    const result = await this.hasPermission(memberId, 'MANAGE_GUILD', serverId);
    return result.granted;
  }

  /**
   * Check if member can manage channels
   */
  static async canManageChannels(memberId: string, serverId?: string): Promise<boolean> {
    const result = await this.hasPermission(memberId, 'MANAGE_CHANNELS', serverId);
    return result.granted;
  }

  /**
   * Check if member can manage roles
   */
  static async canManageRoles(memberId: string, serverId?: string): Promise<boolean> {
    const result = await this.hasPermission(memberId, 'MANAGE_ROLES', serverId);
    return result.granted;
  }

  /**
   * Check if member can kick members
   */
  static async canKickMembers(memberId: string, serverId?: string): Promise<boolean> {
    const result = await this.hasPermission(memberId, 'KICK_MEMBERS', serverId);
    return result.granted;
  }

  /**
   * Check if member can ban members
   */
  static async canBanMembers(memberId: string, serverId?: string): Promise<boolean> {
    const result = await this.hasPermission(memberId, 'BAN_MEMBERS', serverId);
    return result.granted;
  }

  /**
   * Check if member can send messages
   */
  static async canSendMessages(memberId: string, serverId?: string): Promise<boolean> {
    const result = await this.hasPermission(memberId, 'SEND_MESSAGES', serverId);
    return result.granted;
  }

  /**
   * Check if member can view channels
   */
  static async canViewChannels(memberId: string, serverId?: string): Promise<boolean> {
    const result = await this.hasPermission(memberId, 'VIEW_CHANNELS', serverId);
    return result.granted;
  }
}
