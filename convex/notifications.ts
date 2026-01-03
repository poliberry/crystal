import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/helpers";

// Get notifications for current user
export const getMyNotifications = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    // Sort by createdAt descending
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    // Fetch related data
    const notificationsWithData = await Promise.all(
      notifications.map(async (notification) => {
        const triggeredBy = notification.triggeredById
          ? await ctx.db.get(notification.triggeredById)
          : null;
        const server = notification.serverId
          ? await ctx.db.get(notification.serverId)
          : null;
        const channel = notification.channelId
          ? await ctx.db.get(notification.channelId)
          : null;
        const conversation = notification.conversationId
          ? await ctx.db.get(notification.conversationId)
          : null;

        return {
          ...notification,
          triggeredBy: triggeredBy
            ? {
                name: triggeredBy.name,
                imageUrl: triggeredBy.imageUrl,
              }
            : null,
          server: server
            ? {
                name: server.name,
                imageUrl: server.imageUrl,
              }
            : null,
          channel: channel
            ? {
                name: channel.name,
              }
            : null,
          conversation: conversation
            ? {
                name: conversation.name,
                type: conversation.type,
              }
            : null,
        };
      })
    );

    return notificationsWithData;
  },
});

// Get unread count
export const getUnreadCount = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_profileId_read", (q) =>
        q.eq("profileId", profile._id).eq("read", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.profileId !== profile._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.notificationId, {
      read: true,
      readAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  handler: async (ctx) => {
    const profile = await requireProfile(ctx);
    
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_profileId_read", (q) =>
        q.eq("profileId", profile._id).eq("read", false)
      )
      .collect();

    const now = Date.now();
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: now,
        updatedAt: now,
      });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

// Mark conversation notifications as read
export const markConversationAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    
    const conversationNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const profileNotifications = conversationNotifications.filter(
      (n) => n.profileId === profile._id && !n.read
    );

    const now = Date.now();
    for (const notification of profileNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: now,
        updatedAt: now,
      });
    }

    return { success: true, count: profileNotifications.length };
  },
});

// Mark channel notifications as read
export const markChannelAsRead = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    
    const channelNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_channelId", (q) =>
        q.eq("channelId", args.channelId)
      )
      .collect();

    const profileNotifications = channelNotifications.filter(
      (n) => n.profileId === profile._id && !n.read
    );

    const now = Date.now();
    for (const notification of profileNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: now,
        updatedAt: now,
      });
    }

    return { success: true, count: profileNotifications.length };
  },
});

