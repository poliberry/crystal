// Constants to replace Prisma enums for ScyllaDB

export const MemberRole = {
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR', 
  GUEST: 'GUEST'
} as const;

export const ChannelType = {
  TEXT: 'TEXT',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO'
} as const;

export const MessageType = {
  DEFAULT: 'DEFAULT',
  SYSTEM: 'SYSTEM'
} as const;

export type MemberRoleType = typeof MemberRole[keyof typeof MemberRole];
export type ChannelTypeType = typeof ChannelType[keyof typeof ChannelType];
export type MessageTypeType = typeof MessageType[keyof typeof MessageType];
