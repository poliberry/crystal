import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

const MESSAGES_BATCH = 10;

// Get messages for a channel
export const getByChannel = query({
  args: {
    channelId: v.id("channels"),
    cursor: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    // Check if user is a member of the server
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q) =>
        q.eq("profileId", profile._id).eq("serverId", channel.serverId)
      )
      .first();

    if (!member) {
      throw new Error("Unauthorized");
    }

    const messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_channelId_createdAt", (q) => q.eq("channelId", args.channelId));

    const allMessages = await messagesQuery.collect();
    
    // Sort by createdAt descending (newest first)
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
        const memberData = await ctx.db.get(message.memberId);
        if (!memberData) return null;

        const profileData = await ctx.db.get(memberData.profileId);
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
          .collect();

        return {
          ...message,
          member: {
            ...memberData,
            profile: profileData,
          },
          attachments,
        };
      })
    );

    const filtered = messagesWithData.filter(Boolean);
    const lastMessage = filtered[filtered.length - 1];
    const nextCursor =
      filtered.length === MESSAGES_BATCH && startIndex + MESSAGES_BATCH < allMessages.length && lastMessage
        ? lastMessage._id
        : null;

    return {
      items: filtered,
      nextCursor,
    };
  },
});

export const create = mutation({
  args: {
    content: v.string(),
    channelId: v.id("channels"),
    userId: v.optional(v.string()),
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
    
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Get member
    const member = await ctx.db
      .query("members")
      .withIndex("by_profileId_serverId", (q) =>
        q.eq("profileId", profile._id).eq("serverId", channel.serverId)
      )
      .first();

    if (!member) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      memberId: member._id,
      channelId: args.channelId,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create attachments if provided
    if (args.attachments) {
      for (const attachment of args.attachments) {
        await ctx.db.insert("attachments", {
          ...attachment,
          messageId,
          createdAt: now,
        });
      }
    }

    const message = await ctx.db.get(messageId);
    const memberData = await ctx.db.get(member._id);
    const profileData = await ctx.db.get(member.profileId);
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_messageId", (q: any) => q.eq("messageId", messageId))
      .collect();

    return {
      ...message,
      member: {
        ...memberData,
        profile: profileData,
      },
      attachments,
    };
  },
});

// Update message
export const update = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const member = await ctx.db.get(message.memberId);
    if (!member || member.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.messageId);
  },
});

// Delete message (soft delete)
export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const member = await ctx.db.get(message.memberId);
    if (!member || member.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.messageId, {
      deleted: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

