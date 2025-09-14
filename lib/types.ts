// Re-export Prisma-generated types for backward compatibility
// This file provides a centralized location for all type imports

export type {
  Profile,
  Server,
  Member,
  Channel,
  Category,
  Message,
  DirectMessage,
  Conversation,
  ConversationMember,
  Attachment,
  Role,
  MemberRoleAssignment,
  UserPermission,
  ChannelPermission,
  CategoryPermission,
  PermissionAuditLog,
  Notification,
  Friendship,
  Block,
  Ban,
} from "@prisma/client";

export {
  UserStatus,
  PermissionType,
  PermissionGrantType,
  PermissionScope,
  MemberRole,
  ChannelType,
  ConversationType,
} from "@prisma/client";
