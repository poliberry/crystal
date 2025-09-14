import { PermissionType, PermissionScope, PermissionGrantType } from "@/lib/types";

// Re-export Prisma enums for convenience
export { PermissionType, PermissionScope, PermissionGrantType };

// Permission override interface
export interface PermissionOverride {
  permission: PermissionType;
  grant: PermissionGrantType;
  scope: PermissionScope;
  targetId?: string;
}

// Permission check result
export interface PermissionCheckResult {
  granted: boolean;
  reason: 'ADMINISTRATOR' | 'ROLE' | 'USER_OVERRIDE' | 'DENIED' | 'LEGACY_ADMIN';
  source?: string; // Role ID or other source
}

// Member with permission data
export interface MemberWithPermissions {
  id: string;
  profileId: string;
  roles: RoleWithPermissions[];
  userPermissions: PermissionOverride[];
}

// Role with permission data
export interface RoleWithPermissions {
  id: string;
  name: string;
  color: string | null;
  position: number;
  hoisted: boolean;
  mentionable: boolean;
  permissions: PermissionOverride[];
}

// Permission groups for easier management
export const PERMISSION_GROUPS = {
  SERVER_MANAGEMENT: [
    PermissionType.ADMINISTRATOR,
    PermissionType.MANAGE_SERVER,
    PermissionType.MANAGE_ROLES,
    PermissionType.MANAGE_CHANNELS,
    PermissionType.VIEW_AUDIT_LOG,
    PermissionType.MANAGE_WEBHOOKS,
    PermissionType.MANAGE_EMOJIS
  ],
  
  MEMBER_MANAGEMENT: [
    PermissionType.KICK_MEMBERS,
    PermissionType.BAN_MEMBERS,
    PermissionType.TIMEOUT_MEMBERS,
    PermissionType.MANAGE_NICKNAMES,
    PermissionType.CHANGE_NICKNAME
  ],
  
  TEXT_PERMISSIONS: [
    PermissionType.VIEW_CHANNELS,
    PermissionType.SEND_MESSAGES,
    PermissionType.SEND_TTS_MESSAGES,
    PermissionType.MANAGE_MESSAGES,
    PermissionType.EMBED_LINKS,
    PermissionType.ATTACH_FILES,
    PermissionType.READ_MESSAGE_HISTORY,
    PermissionType.MENTION_EVERYONE,
    PermissionType.USE_EXTERNAL_EMOJIS,
    PermissionType.ADD_REACTIONS
  ],
  
  VOICE_PERMISSIONS: [
    PermissionType.CONNECT,
    PermissionType.SPEAK,
    PermissionType.MUTE_MEMBERS,
    PermissionType.DEAFEN_MEMBERS,
    PermissionType.MOVE_MEMBERS,
    PermissionType.USE_VAD,
    PermissionType.PRIORITY_SPEAKER
  ],
  
  STAGE_PERMISSIONS: [
    PermissionType.REQUEST_TO_SPEAK,
    PermissionType.MANAGE_STAGE
  ],
  
  ADVANCED_PERMISSIONS: [
    PermissionType.CREATE_INSTANT_INVITE,
    PermissionType.USE_SLASH_COMMANDS,
    PermissionType.USE_APPLICATION_COMMANDS,
    PermissionType.SEND_MESSAGES_IN_THREADS,
    PermissionType.CREATE_PUBLIC_THREADS,
    PermissionType.CREATE_PRIVATE_THREADS,
    PermissionType.MANAGE_THREADS,
    PermissionType.USE_EXTERNAL_STICKERS,
    PermissionType.SEND_VOICE_MESSAGES
  ]
};

// Default permissions for new roles
export const DEFAULT_ROLE_PERMISSIONS: PermissionOverride[] = [
  {
    permission: PermissionType.VIEW_CHANNELS,
    grant: PermissionGrantType.ALLOW,
    scope: PermissionScope.SERVER
  },
  {
    permission: PermissionType.SEND_MESSAGES,
    grant: PermissionGrantType.ALLOW,
    scope: PermissionScope.SERVER
  },
  {
    permission: PermissionType.READ_MESSAGE_HISTORY,
    grant: PermissionGrantType.ALLOW,
    scope: PermissionScope.SERVER
  },
  {
    permission: PermissionType.CONNECT,
    grant: PermissionGrantType.ALLOW,
    scope: PermissionScope.SERVER
  },
  {
    permission: PermissionType.SPEAK,
    grant: PermissionGrantType.ALLOW,
    scope: PermissionScope.SERVER
  },
  {
    permission: PermissionType.ADD_REACTIONS,
    grant: PermissionGrantType.ALLOW,
    scope: PermissionScope.SERVER
  }
];

// Administrator permissions (includes all permissions)
export const ADMINISTRATOR_PERMISSIONS: PermissionOverride[] = 
  Object.values(PermissionType).map(permission => ({
    permission,
    grant: PermissionGrantType.ALLOW,
    scope: PermissionScope.SERVER
  }));

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS: Record<PermissionType, string> = {
  [PermissionType.ADMINISTRATOR]: "Grants all permissions, including the ability to manage all aspects of the server",
  [PermissionType.MANAGE_SERVER]: "Allows management of server settings",
  [PermissionType.MANAGE_CHANNELS]: "Allows creation, editing, and deletion of channels",
  [PermissionType.MANAGE_ROLES]: "Allows creation, editing, and deletion of roles",
  [PermissionType.MANAGE_EMOJIS]: "Allows management of custom emojis and stickers",
  [PermissionType.VIEW_AUDIT_LOG]: "Allows viewing of the server audit log",
  [PermissionType.VIEW_GUILD_INSIGHTS]: "Allows access to server insights",
  [PermissionType.MANAGE_WEBHOOKS]: "Allows creation and management of webhooks",
  [PermissionType.MANAGE_GUILD]: "Allows management of general server settings",
  
  [PermissionType.KICK_MEMBERS]: "Allows kicking members from the server",
  [PermissionType.BAN_MEMBERS]: "Allows banning members from the server",
  [PermissionType.TIMEOUT_MEMBERS]: "Allows putting members in timeout",
  [PermissionType.MANAGE_NICKNAMES]: "Allows changing other members' nicknames",
  [PermissionType.CHANGE_NICKNAME]: "Allows changing own nickname",
  
  [PermissionType.VIEW_CHANNELS]: "Allows viewing of channels",
  [PermissionType.SEND_MESSAGES]: "Allows sending messages in text channels",
  [PermissionType.SEND_TTS_MESSAGES]: "Allows sending text-to-speech messages",
  [PermissionType.MANAGE_MESSAGES]: "Allows deleting and editing messages from other users",
  [PermissionType.EMBED_LINKS]: "Allows links to embed automatically",
  [PermissionType.ATTACH_FILES]: "Allows uploading images and files",
  [PermissionType.READ_MESSAGE_HISTORY]: "Allows reading previous messages",
  [PermissionType.MENTION_EVERYONE]: "Allows mentioning @everyone and @here",
  [PermissionType.USE_EXTERNAL_EMOJIS]: "Allows using emojis from other servers",
  [PermissionType.ADD_REACTIONS]: "Allows adding new reactions to messages",
  
  [PermissionType.CONNECT]: "Allows connecting to voice channels",
  [PermissionType.SPEAK]: "Allows speaking in voice channels",
  [PermissionType.MUTE_MEMBERS]: "Allows muting members in voice channels",
  [PermissionType.DEAFEN_MEMBERS]: "Allows deafening members in voice channels",
  [PermissionType.MOVE_MEMBERS]: "Allows moving members between voice channels",
  [PermissionType.USE_VAD]: "Allows using voice activity detection",
  [PermissionType.PRIORITY_SPEAKER]: "Allows priority speaker in voice channels",
  
  [PermissionType.REQUEST_TO_SPEAK]: "Allows requesting to speak in stage channels",
  [PermissionType.MANAGE_STAGE]: "Allows managing stage channels",
  
  [PermissionType.CREATE_INSTANT_INVITE]: "Allows creating instant invites",
  [PermissionType.USE_SLASH_COMMANDS]: "Allows using slash commands",
  [PermissionType.USE_APPLICATION_COMMANDS]: "Allows using application commands",
  [PermissionType.SEND_MESSAGES_IN_THREADS]: "Allows sending messages in threads",
  [PermissionType.CREATE_PUBLIC_THREADS]: "Allows creating public threads",
  [PermissionType.CREATE_PRIVATE_THREADS]: "Allows creating private threads",
  [PermissionType.MANAGE_THREADS]: "Allows managing threads",
  [PermissionType.USE_EXTERNAL_STICKERS]: "Allows using stickers from other servers",
  [PermissionType.SEND_VOICE_MESSAGES]: "Allows sending voice messages"
};
