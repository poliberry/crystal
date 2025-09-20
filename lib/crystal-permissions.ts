/**
 * Ultra-simple permission system for Crystal
 * Only checks: Server Owner vs Regular Member
 */

import { db } from "@/lib/db";

export interface UserPermissions {
  // Server Management
  canManageServer: boolean;
  canDeleteServer: boolean;
  canManageRoles: boolean;
  canManageMembers: boolean;
  canViewAuditLog: boolean;
  
  // Channel Management  
  canManageChannels: boolean;
  canCreateChannels: boolean;
  canDeleteChannels: boolean;
  canManageCategories: boolean;
  
  // Member Actions
  canKickMembers: boolean;
  canBanMembers: boolean;
  canInviteMembers: boolean;
  
  // Basic Permissions
  canSendMessages: boolean;
  canViewChannels: boolean;
  canConnectToVoice: boolean;
  
  // Meta
  isServerOwner: boolean;
  isAdmin: boolean;
}

export class CrystalPermissions {
  
  /**
   * Get all permissions for a user in a server
   */
  static async getUserPermissions(memberId: string): Promise<UserPermissions> {
    try {
      console.log('[CrystalPermissions] Checking permissions for member:', memberId);
      
      // Get member
      const member = await db.member.findFirst({
        id: memberId
      });

      console.log('[CrystalPermissions] Found member:', member);

      if (!member) {
        console.log('[CrystalPermissions] No member found, returning default permissions');
        return this.getDefaultPermissions();
      }

      // Get server 
      const server = await db.server.findFirst({
        id: member.serverId
      });

      console.log('[CrystalPermissions] Found server:', server);

      if (!server) {
        console.log('[CrystalPermissions] No server found, returning default permissions');
        return this.getDefaultPermissions();
      }

      // Check if user is server owner
      const isServerOwner = member.profile_id === server.profile_id;
      console.log('[CrystalPermissions] Is server owner?', isServerOwner, {
        memberProfileId: member.profileId,
        serverProfileId: server.profileId
      });
      
      // Check if user is admin
      const isAdmin = member.role === 'ADMIN';
      console.log('[CrystalPermissions] Is admin?', isAdmin, 'Role:', member.role);

      // Server owners get everything
      if (isServerOwner) {
        console.log('[CrystalPermissions] User is server owner, granting all permissions');
        return this.getServerOwnerPermissions();
      }

      // Admins get most things
      if (isAdmin) {
        console.log('[CrystalPermissions] User is admin, granting admin permissions');
        return this.getAdminPermissions();
      }

      // Regular members get basic permissions
      console.log('[CrystalPermissions] User is regular member, granting basic permissions');
      return this.getBasicMemberPermissions();

    } catch (error) {
      console.error('[CrystalPermissions] Error getting user permissions:', error);
      return this.getDefaultPermissions();
    }
  }

  /**
   * Quick check if user is server owner
   */
  static async isServerOwner(memberId: string): Promise<boolean> {
    try {
      const member = await db.member.findFirst({
        id: memberId
      });

      if (!member) return false;

      const server = await db.server.findFirst({
        id: member.serverId
      });

      if (!server) return false;

      return member.profileId === server.profileId;
    } catch (error) {
      console.error('Error checking server ownership:', error);
      return false;
    }
  }

  /**
   * Quick check if user can manage server
   */
  static async canManageServer(memberId: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(memberId);
    return permissions.canManageServer;
  }

  /**
   * Quick check if user can manage channels
   */
  static async canManageChannels(memberId: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(memberId);
    return permissions.canManageChannels;
  }

  // ===== PERMISSION PRESETS =====

  private static getServerOwnerPermissions(): UserPermissions {
    return {
      // Server Management
      canManageServer: true,
      canDeleteServer: true,
      canManageRoles: true,
      canManageMembers: true,
      canViewAuditLog: true,
      
      // Channel Management
      canManageChannels: true,
      canCreateChannels: true,
      canDeleteChannels: true,
      canManageCategories: true,
      
      // Member Actions
      canKickMembers: true,
      canBanMembers: true,
      canInviteMembers: true,
      
      // Basic Permissions
      canSendMessages: true,
      canViewChannels: true,
      canConnectToVoice: true,
      
      // Meta
      isServerOwner: true,
      isAdmin: true,
    };
  }

  private static getAdminPermissions(): UserPermissions {
    return {
      // Server Management
      canManageServer: true,
      canDeleteServer: false, // Only owner can delete
      canManageRoles: true,
      canManageMembers: true,
      canViewAuditLog: true,
      
      // Channel Management
      canManageChannels: true,
      canCreateChannels: true,
      canDeleteChannels: true,
      canManageCategories: true,
      
      // Member Actions
      canKickMembers: true,
      canBanMembers: true,
      canInviteMembers: true,
      
      // Basic Permissions
      canSendMessages: true,
      canViewChannels: true,
      canConnectToVoice: true,
      
      // Meta
      isServerOwner: false,
      isAdmin: true,
    };
  }

  private static getBasicMemberPermissions(): UserPermissions {
    return {
      // Server Management
      canManageServer: false,
      canDeleteServer: false,
      canManageRoles: false,
      canManageMembers: false,
      canViewAuditLog: false,
      
      // Channel Management
      canManageChannels: false,
      canCreateChannels: false,
      canDeleteChannels: false,
      canManageCategories: false,
      
      // Member Actions
      canKickMembers: false,
      canBanMembers: false,
      canInviteMembers: true, // Members can invite
      
      // Basic Permissions
      canSendMessages: true,
      canViewChannels: true,
      canConnectToVoice: true,
      
      // Meta
      isServerOwner: false,
      isAdmin: false,
    };
  }

  private static getDefaultPermissions(): UserPermissions {
    return {
      // Server Management
      canManageServer: false,
      canDeleteServer: false,
      canManageRoles: false,
      canManageMembers: false,
      canViewAuditLog: false,
      
      // Channel Management
      canManageChannels: false,
      canCreateChannels: false,
      canDeleteChannels: false,
      canManageCategories: false,
      
      // Member Actions
      canKickMembers: false,
      canBanMembers: false,
      canInviteMembers: false,
      
      // Basic Permissions
      canSendMessages: false,
      canViewChannels: false,
      canConnectToVoice: false,
      
      // Meta
      isServerOwner: false,
      isAdmin: false,
    };
  }
}
