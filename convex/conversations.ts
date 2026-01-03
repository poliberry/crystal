import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

// Get conversations for current user
export const getMyConversations = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const conversationMembers = await ctx.db
      .query("conversationMembers")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    // Filter active conversations
    const activeConversations = conversationMembers.filter(
      (cm) => !cm.leftAt
    );

    const conversations = await Promise.all(
      activeConversations.map(async (cm) => {
        const conversation = await ctx.db.get(cm.conversationId);
        if (!conversation) return null;

        // Get all members
        const allMembers = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversationId", (q) =>
            q.eq("conversationId", cm.conversationId)
          )
          .collect();

        const activeMembers = allMembers.filter((m) => !m.leftAt);
        const membersWithData = await Promise.all(
          activeMembers.map(async (m) => {
            const profileData = await ctx.db.get(m.profileId);
            const memberData = m.memberId ? await ctx.db.get(m.memberId) : null;
            return {
              ...m,
              profile: profileData,
              member: memberData
                ? {
                    ...memberData,
                    profile: profileData,
                  }
                : null,
            };
          })
        );

        // Get last message
        const lastMessages = await ctx.db
          .query("directMessages")
          .withIndex("by_conversationId_createdAt", (q) =>
            q.eq("conversationId", cm.conversationId)
          )
          .collect();

        lastMessages.sort((a, b) => b.createdAt - a.createdAt);
        const lastMessageRaw = lastMessages[0] || null;
        
        // Populate profile data for last message
        let lastMessage = null;
        if (lastMessageRaw) {
          const messageProfile = await ctx.db.get(lastMessageRaw.profileId);
          const messageMember = lastMessageRaw.memberId
            ? await ctx.db.get(lastMessageRaw.memberId)
            : null;
          
          lastMessage = {
            ...lastMessageRaw,
            profile: messageProfile,
            member: messageMember
              ? {
                  ...messageMember,
                  profile: messageProfile,
                }
              : null,
          };
        }

        return {
          ...conversation,
          members: membersWithData,
          lastMessage,
        };
      })
    );

    // Sort by updatedAt descending
    conversations.sort((a, b) => {
      if (!a || !b) return 0;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    return conversations.filter(Boolean);
  },
});

// Get conversation by ID
export const getById = query({
  args: { 
    conversationId: v.id("conversations"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return null;
    }

    // Check if user is a member
    const member = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_profileId", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();

    if (!member || member.leftAt) {
      throw new Error("Unauthorized");
    }

    // Get all members
    const allMembers = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const activeMembers = allMembers.filter((m) => !m.leftAt);
    const membersWithData = await Promise.all(
      activeMembers.map(async (m) => {
        const profileData = await ctx.db.get(m.profileId);
        const memberData = m.memberId ? await ctx.db.get(m.memberId) : null;
        return {
          ...m,
          profile: profileData,
          member: memberData
            ? {
                ...memberData,
                profile: profileData,
              }
            : null,
        };
      })
    );

    return {
      ...conversation,
      members: membersWithData,
    };
  },
});

// Create direct message conversation
export const createDirect = mutation({
  args: { 
    otherProfileId: v.id("profiles"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    if (profile._id === args.otherProfileId) {
      throw new Error("Cannot create conversation with yourself");
    }

    const otherProfile = await ctx.db.get(args.otherProfileId);
    if (!otherProfile) {
      throw new Error("User not found");
    }

    // Check if users are friends (for privacy)
    const friendship = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", profile._id).eq("addresseeId", args.otherProfileId)
      )
      .first();

    const reverseFriendship = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", args.otherProfileId).eq("addresseeId", profile._id)
      )
      .first();

    const isFriend = 
      (friendship?.status === "ACCEPTED") || 
      (reverseFriendship?.status === "ACCEPTED");

    // Check if blocked
    const isBlocked = 
      (friendship?.status === "BLOCKED") || 
      (reverseFriendship?.status === "BLOCKED");

    if (isBlocked) {
      throw new Error("Cannot create conversation with blocked user");
    }

    // Note: In a full implementation, you'd check privacy settings here
    // For now, we allow conversation creation if not blocked
    // You can add privacy checks like "only friends can message" later

    // Check if conversation already exists
    const existingConversations = await ctx.db
      .query("conversationMembers")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    for (const cm of existingConversations) {
      const conversation = await ctx.db.get(cm.conversationId);
      if (conversation?.type === "DIRECT_MESSAGE") {
        const otherMember = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversationId_profileId", (q) =>
            q
              .eq("conversationId", cm.conversationId)
              .eq("profileId", args.otherProfileId)
          )
          .first();

        if (otherMember && !otherMember.leftAt) {
          return conversation; // Return existing conversation
        }
      }
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      type: "DIRECT_MESSAGE",
      createdAt: now,
      updatedAt: now,
    });

    // Add both members
    await ctx.db.insert("conversationMembers", {
      conversationId,
      profileId: profile._id,
      joinedAt: now,
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      profileId: args.otherProfileId,
      joinedAt: now,
    });

    return await ctx.db.get(conversationId);
  },
});

// Create group conversation
export const createGroup = mutation({
  args: {
    name: v.optional(v.string()),
    memberIds: v.array(v.id("profiles")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      name: args.name,
      type: "GROUP_MESSAGE",
      createdAt: now,
      updatedAt: now,
    });

    // Add creator
    await ctx.db.insert("conversationMembers", {
      conversationId,
      profileId: profile._id,
      joinedAt: now,
    });

    // Add other members
    for (const memberId of args.memberIds) {
      if (memberId !== profile._id) {
        await ctx.db.insert("conversationMembers", {
          conversationId,
          profileId: memberId,
          joinedAt: now,
        });
      }
    }

    return await ctx.db.get(conversationId);
  },
});

// Get or create personal space conversation (self-conversation)
export const getOrCreatePersonalSpace = mutation({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    // Check if personal space conversation already exists
    const existingConversations = await ctx.db
      .query("conversationMembers")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    for (const cm of existingConversations) {
      const conversation = await ctx.db.get(cm.conversationId);
      if (conversation?.type === "DIRECT_MESSAGE") {
        // Check if it's a self-conversation (same profile as both members)
        const allMembers = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversationId", (q) =>
            q.eq("conversationId", cm.conversationId)
          )
          .collect();

        const activeMembers = allMembers.filter((m) => !m.leftAt);
        
        // If only one member and it's the current user, it's a personal space
        if (activeMembers.length === 1 && activeMembers[0].profileId === profile._id) {
          return conversation;
        }
        
        // If two members but both are the same profile, it's a personal space
        if (activeMembers.length === 2 && 
            activeMembers[0].profileId === profile._id && 
            activeMembers[1].profileId === profile._id) {
          return conversation;
        }
      }
    }

    // Create new personal space conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      type: "DIRECT_MESSAGE",
      createdAt: now,
      updatedAt: now,
    });

    // Add the user as the only member (personal space)
    await ctx.db.insert("conversationMembers", {
      conversationId,
      profileId: profile._id,
      joinedAt: now,
    });

    return await ctx.db.get(conversationId);
  },
});

// Update group conversation
export const updateGroup = mutation({
  args: {
    conversationId: v.id("conversations"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.union(v.string(), v.null())),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.type !== "GROUP_MESSAGE") {
      throw new Error("Can only update group conversations");
    }

    // Check if user is a member
    const member = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_profileId", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();

    if (!member || member.leftAt) {
      throw new Error("Unauthorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.imageUrl !== undefined) {
      // Convert empty string to null, keep null as null, or set the string value
      updates.imageUrl = args.imageUrl === "" ? null : args.imageUrl;
    }

    await ctx.db.patch(args.conversationId, updates);
    return await ctx.db.get(args.conversationId);
  },
});

// Add members to group
export const addMembers = mutation({
  args: {
    conversationId: v.id("conversations"),
    memberIds: v.array(v.id("profiles")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.type !== "GROUP_MESSAGE") {
      throw new Error("Can only add members to group conversations");
    }

    // Check if user is a member
    const member = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_profileId", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();

    if (!member || member.leftAt) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    for (const memberId of args.memberIds) {
      // Check if already a member
      const existingMember = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId_profileId", (q) =>
          q.eq("conversationId", args.conversationId).eq("profileId", memberId)
        )
        .first();

      if (!existingMember || existingMember.leftAt) {
        // Add new member or re-add if they left
        if (existingMember) {
          // Re-add by removing leftAt
          await ctx.db.patch(existingMember._id, {
            leftAt: undefined,
            joinedAt: now,
          });
        } else {
          await ctx.db.insert("conversationMembers", {
            conversationId: args.conversationId,
            profileId: memberId,
            joinedAt: now,
          });
        }
      }
    }

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, { updatedAt: now });
    return await ctx.db.get(args.conversationId);
  },
});

// Remove member from group
export const removeMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    profileId: v.id("profiles"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.type !== "GROUP_MESSAGE") {
      throw new Error("Can only remove members from group conversations");
    }

    // Check if user is a member
    const member = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_profileId", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();

    if (!member || member.leftAt) {
      throw new Error("Unauthorized");
    }

    // Find the member to remove
    const memberToRemove = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_profileId", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", args.profileId)
      )
      .first();

    if (memberToRemove && !memberToRemove.leftAt) {
      await ctx.db.patch(memberToRemove._id, { leftAt: Date.now() });
    }

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    return await ctx.db.get(args.conversationId);
  },
});
