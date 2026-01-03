import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

const MESSAGES_BATCH = 10;

// Get direct messages for a conversation
export const getByConversation = query({
  args: {
    conversationId: v.id("conversations"),
    cursor: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    // Check if user is a member of the conversation
    const member = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_profileId", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();

    if (!member || member.leftAt) {
      throw new Error("Unauthorized");
    }

    let query = ctx.db
      .query("directMessages")
      .withIndex("by_conversationId_createdAt", (q) =>
        q.eq("conversationId", args.conversationId)
      );

    const allMessages = await query.collect();
    
    // Sort by createdAt descending
    allMessages.sort((a, b) => b.createdAt - a.createdAt);

    // Apply cursor if provided
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = allMessages.findIndex((m) => m._id === args.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const messages = allMessages.slice(startIndex, startIndex + MESSAGES_BATCH);

    // Fetch related data
    const messagesWithData = await Promise.all(
      messages.map(async (message) => {
        const profileData = await ctx.db.get(message.profileId);
        const memberData = message.memberId
          ? await ctx.db.get(message.memberId)
          : null;
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_directMessageId", (q) =>
            q.eq("directMessageId", message._id)
          )
          .collect();

        return {
          ...message,
          profile: profileData,
          member: memberData
            ? {
                ...memberData,
                profile: profileData,
              }
            : null,
          attachments,
        };
      })
    );

    const nextCursor =
      messagesWithData.length === MESSAGES_BATCH &&
      startIndex + MESSAGES_BATCH < allMessages.length
        ? messagesWithData[messagesWithData.length - 1]._id
        : null;

    return {
      items: messagesWithData,
      nextCursor,
    };
  },
});

// Create direct message
export const create = mutation({
  args: {
    content: v.string(),
    conversationId: v.id("conversations"),
    userId: v.optional(v.string()),
    replyToId: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          utId: v.string(),
          name: v.string(),
          url: v.string(),
          size: v.optional(v.number()),
          type: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
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
    const messageId = await ctx.db.insert("directMessages", {
      content: args.content,
      profileId: profile._id,
      memberId: member.memberId,
      conversationId: args.conversationId,
      replyToId: args.replyToId,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create attachments if provided
    if (args.attachments) {
      for (const attachment of args.attachments) {
        await ctx.db.insert("attachments", {
          ...attachment,
          directMessageId: messageId,
          createdAt: now,
        });
      }
    }

    // Update conversation updatedAt
    await ctx.db.patch(args.conversationId, {
      updatedAt: now,
    });

    const message = await ctx.db.get(messageId);
    const profileData = await ctx.db.get(profile._id);
    const memberData = member.memberId
      ? await ctx.db.get(member.memberId)
      : null;
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_directMessageId", (q) => q.eq("directMessageId", messageId))
      .collect();

    return {
      ...message,
      profile: profileData,
      member: memberData
        ? {
            ...memberData,
            profile: profileData,
          }
        : null,
      attachments,
    };
  },
});

// Update direct message
export const update = mutation({
  args: {
    messageId: v.id("directMessages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.messageId);
  },
});

// Delete direct message (soft delete)
export const remove = mutation({
  args: { messageId: v.id("directMessages") },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.messageId, {
      deleted: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

