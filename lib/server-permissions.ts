import { MemberRole } from "@prisma/client";

export enum ServerPermission {
  // Basic permissions
  VIEW_CHANNELS = "VIEW_CHANNELS",
  SEND_MESSAGES = "SEND_MESSAGES",
  MANAGE_MESSAGES = "MANAGE_MESSAGES",
  
  // Voice permissions  
  CONNECT = "CONNECT",
  SPEAK = "SPEAK",
  MUTE_MEMBERS = "MUTE_MEMBERS",
  DEAFEN_MEMBERS = "DEAFEN_MEMBERS",
  MOVE_MEMBERS = "MOVE_MEMBERS",
  
  // Stage permissions
  REQUEST_TO_SPEAK = "REQUEST_TO_SPEAK",
  MANAGE_STAGE = "MANAGE_STAGE", // Can approve/deny speaker requests, move people to/from stage
  
  // Channel management
  MANAGE_CHANNELS = "MANAGE_CHANNELS",
  
  // Server management
  MANAGE_ROLES = "MANAGE_ROLES",
  MANAGE_SERVER = "MANAGE_SERVER",
  ADMINISTRATOR = "ADMINISTRATOR",
}

const rolePermissions: Record<MemberRole, ServerPermission[]> = {
  [MemberRole.GUEST]: [
    ServerPermission.VIEW_CHANNELS,
    ServerPermission.SEND_MESSAGES,
    ServerPermission.CONNECT,
    ServerPermission.SPEAK,
    ServerPermission.REQUEST_TO_SPEAK,
  ],
  [MemberRole.MODERATOR]: [
    ServerPermission.VIEW_CHANNELS,
    ServerPermission.SEND_MESSAGES,
    ServerPermission.MANAGE_MESSAGES,
    ServerPermission.CONNECT,
    ServerPermission.SPEAK,
    ServerPermission.MUTE_MEMBERS,
    ServerPermission.DEAFEN_MEMBERS,
    ServerPermission.MOVE_MEMBERS,
    ServerPermission.REQUEST_TO_SPEAK,
    ServerPermission.MANAGE_STAGE,
    ServerPermission.MANAGE_CHANNELS,
  ],
  [MemberRole.ADMIN]: [
    ServerPermission.ADMINISTRATOR, // Admins have all permissions
  ],
};

export function hasPermission(memberRole: MemberRole, permission: ServerPermission): boolean {
  // Admins have all permissions
  if (memberRole === MemberRole.ADMIN) {
    return true;
  }
  
  const permissions = rolePermissions[memberRole] || [];
  return permissions.includes(permission);
}

export function getRolePermissions(memberRole: MemberRole): ServerPermission[] {
  // Admins have all permissions
  if (memberRole === MemberRole.ADMIN) {
    return Object.values(ServerPermission);
  }
  
  return rolePermissions[memberRole] || [];
}

export function canManageStage(memberRole: MemberRole): boolean {
  return hasPermission(memberRole, ServerPermission.MANAGE_STAGE) || 
         hasPermission(memberRole, ServerPermission.ADMINISTRATOR);
}

export function canRequestToSpeak(memberRole: MemberRole): boolean {
  return hasPermission(memberRole, ServerPermission.REQUEST_TO_SPEAK);
}
