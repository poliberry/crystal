import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    name: v.string(),
    globalName: v.optional(v.string()),
    imageUrl: v.string(),
    email: v.string(),
    passwordHash: v.optional(v.string()),
    customCss: v.optional(v.string()),
    status: v.union(
      v.literal("ONLINE"),
      v.literal("IDLE"),
      v.literal("DND"),
      v.literal("INVISIBLE"),
      v.literal("OFFLINE")
    ),
    prevStatus: v.optional(
      v.union(
        v.literal("ONLINE"),
        v.literal("IDLE"),
        v.literal("DND"),
        v.literal("INVISIBLE"),
        v.literal("OFFLINE")
      )
    ),
    bio: v.optional(v.string()),
    presenceStatus: v.optional(v.string()),
    pronouns: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

  servers: defineTable({
    name: v.string(),
    imageUrl: v.string(),
    bannerUrl: v.optional(v.string()),
    inviteCode: v.string(),
    profileId: v.id("profiles"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_inviteCode", ["inviteCode"]),

  members: defineTable({
    roleIds: v.optional(v.array(v.id("roles"))), // Array of role IDs for multiple roles
    roleId: v.optional(v.id("roles")), // Legacy field for backward compatibility
    role: v.union(v.literal("ADMIN"), v.literal("MODERATOR"), v.literal("GUEST")), // Legacy field for backward compatibility
    profileId: v.id("profiles"),
    serverId: v.id("servers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_serverId", ["serverId"])
    .index("by_profileId_serverId", ["profileId", "serverId"])
    .index("by_roleId", ["roleId"]),

  roles: defineTable({
    name: v.string(),
    serverId: v.id("servers"),
    color: v.optional(v.string()),
    permissions: v.array(v.string()), // Array of permission strings
    position: v.number(), // For ordering roles
    index: v.optional(v.number()), // For ordering hoisted roles in member list
    mentionable: v.boolean(),
    hoist: v.boolean(), // Show members with this role separately
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_serverId", ["serverId"])
    .index("by_serverId_position", ["serverId", "position"]),

  friends: defineTable({
    requesterId: v.id("profiles"),
    addresseeId: v.id("profiles"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("BLOCKED")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_requesterId", ["requesterId"])
    .index("by_addresseeId", ["addresseeId"])
    .index("by_requesterId_addresseeId", ["requesterId", "addresseeId"])
    .index("by_status", ["status"]),

  categories: defineTable({
    name: v.string(),
    serverId: v.optional(v.id("servers")),
  })
    .index("by_serverId", ["serverId"]),

  channels: defineTable({
    name: v.string(),
    type: v.union(v.literal("TEXT"), v.literal("AUDIO"), v.literal("VIDEO")),
    profileId: v.id("profiles"),
    serverId: v.id("servers"),
    categoryId: v.optional(v.id("categories")),
    position: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_serverId", ["serverId"])
    .index("by_categoryId", ["categoryId"])
    .index("by_serverId_categoryId", ["serverId", "categoryId"]),

  // Voice participants tracked for server/channel audio rooms (LiveKit rooms)
  voiceParticipants: defineTable({
    // LiveKit room name (e.g., channel.id)
    roomName: v.string(),
    // Optional Convex channel id reference
    channelId: v.optional(v.id("channels")),
    // Optional profile reference
    profileId: v.optional(v.id("profiles")),
    // Optional external user id (app userId)
    userId: v.optional(v.string()),
    // The display identity shown in LiveKit
    identity: v.string(),
    // Avatar URL if provided
    avatar: v.optional(v.string()),
    // Whether the participant is currently speaking
    isSpeaking: v.boolean(),
    // Last update time (ms since epoch)
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_roomName", ["roomName"])
    .index("by_channelId", ["channelId"]),

  attachments: defineTable({
    utId: v.string(),
    name: v.string(),
    url: v.string(),
    size: v.optional(v.number()),
    type: v.optional(v.string()),
    messageId: v.optional(v.id("messages")),
    directMessageId: v.optional(v.id("directMessages")),
    createdAt: v.number(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_directMessageId", ["directMessageId"]),

  messages: defineTable({
    content: v.string(),
    memberId: v.id("members"),
    channelId: v.id("channels"),
    deleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_channelId", ["channelId"])
    .index("by_channelId_createdAt", ["channelId", "createdAt"]),

  conversations: defineTable({
    name: v.optional(v.string()),
    type: v.union(v.literal("DIRECT_MESSAGE"), v.literal("GROUP_MESSAGE")),
    creatorId: v.optional(v.id("members")),
    imageUrl: v.optional(v.union(v.string(), v.null())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creatorId", ["creatorId"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    profileId: v.id("profiles"),
    memberId: v.optional(v.id("members")),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    lastReadAt: v.optional(v.number()),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_profileId", ["profileId"])
    .index("by_memberId", ["memberId"])
    .index("by_conversationId_profileId", ["conversationId", "profileId"]),

  directMessages: defineTable({
    content: v.string(),
    profileId: v.id("profiles"),
    memberId: v.optional(v.id("members")),
    conversationId: v.id("conversations"),
    replyToId: v.optional(v.string()),
    deleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_memberId", ["memberId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_replyToId", ["replyToId"])
    .index("by_conversationId_createdAt", ["conversationId", "createdAt"]),

  notifications: defineTable({
    type: v.union(
      v.literal("MESSAGE"),
      v.literal("MENTION"),
      v.literal("REPLY"),
      v.literal("FRIEND_REQUEST"),
      v.literal("CALL"),
      v.literal("SERVER_INVITE"),
      v.literal("SYSTEM")
    ),
    title: v.string(),
    content: v.optional(v.string()),
    profileId: v.id("profiles"),
    triggeredById: v.optional(v.id("profiles")),
    serverId: v.optional(v.id("servers")),
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.string()),
    directMessageId: v.optional(v.string()),
    read: v.boolean(),
    readAt: v.optional(v.number()),
    groupKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_triggeredById", ["triggeredById"])
    .index("by_serverId", ["serverId"])
    .index("by_channelId", ["channelId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_groupKey", ["groupKey"])
    .index("by_profileId_read", ["profileId", "read"]),

  userCustomisation: defineTable({
    profileId: v.id("profiles"),
    userId: v.string(),
    chatMode: v.optional(
      v.union(v.literal("DEFAULT"), v.literal("IRC"))
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_userId", ["userId"]),

  typingIndicators: defineTable({
    profileId: v.id("profiles"),
    channelId: v.optional(v.id("channels")),
    conversationId: v.optional(v.id("conversations")),
    updatedAt: v.number(),
  })
    .index("by_channelId", ["channelId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_profileId", ["profileId"])
    .index("by_profileId_channelId", ["profileId", "channelId"])
    .index("by_profileId_conversationId", ["profileId", "conversationId"]),

  notificationSettings: defineTable({
    profileId: v.id("profiles"),
    userId: v.string(),
    serverMessages: v.boolean(), // Enable/disable server message notifications
    directMessages: v.boolean(), // Enable/disable direct message notifications
    friendRequests: v.boolean(), // Enable/disable friend request notifications
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_userId", ["userId"]),

  mutedChannels: defineTable({
    profileId: v.id("profiles"),
    userId: v.string(),
    channelId: v.id("channels"),
    serverId: v.id("servers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_userId", ["userId"])
    .index("by_channelId", ["channelId"])
    .index("by_userId_channelId", ["userId", "channelId"]),

  mutedServers: defineTable({
    profileId: v.id("profiles"),
    userId: v.string(),
    serverId: v.id("servers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_userId", ["userId"])
    .index("by_serverId", ["serverId"])
    .index("by_userId_serverId", ["userId", "serverId"]),
});

