import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentProfile } from "./lib/helpers";

// Upsert or create a participant record
export const upsertParticipant = mutation({
  args: {
    roomName: v.string(),
    channelId: v.optional(v.id("channels")),
    userId: v.optional(v.string()),
    identity: v.string(),
    avatar: v.optional(v.string()),
    isSpeaking: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const rows = await ctx.db
      .query("voiceParticipants")
      .withIndex("by_roomName", (q) => q.eq("roomName", args.roomName))
      .collect();

    let existing = null;
    if (args.userId) {
      existing = rows.find((p) => p.userId === args.userId);
    }

    if (!existing) {
      existing = rows.find((p) => p.identity === args.identity);
    }

    // Resolve profileId if userId is present
    let profileId = null;
    if (args.userId) {
      try {
        const profile = await getCurrentProfile(ctx, args.userId);
        profileId = profile ? profile._id : null;
      } catch (e) {
        profileId = null;
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        avatar: args.avatar ?? existing.avatar,
        isSpeaking: args.isSpeaking ?? existing.isSpeaking,
        lastSeenAt: now,
        userId: args.userId ?? existing.userId,
        channelId: args.channelId ?? existing.channelId,
        profileId: profileId ?? existing.profileId,
      });
    } else {
      await ctx.db.insert("voiceParticipants", {
        roomName: args.roomName,
        channelId: args.channelId ?? undefined,
        profileId: profileId ?? undefined,
        userId: args.userId ?? undefined,
        identity: args.identity,
        avatar: args.avatar ?? undefined,
        isSpeaking: args.isSpeaking ?? false,
        lastSeenAt: now,
        createdAt: now,
      });
    }
  },
});

// Remove a participant record (on leave/disconnect)
export const removeParticipant = mutation({
  args: {
    roomName: v.string(),
    identity: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find matching participants
    let matches: any[] = [];
    if (args.userId) {
      matches = (
        await ctx.db
          .query("voiceParticipants")
          .withIndex("by_roomName", (q) => q.eq("roomName", args.roomName))
          .collect()
      ).filter((p) => p.userId === args.userId);
    } else if (args.identity) {
      matches = (
        await ctx.db
          .query("voiceParticipants")
          .withIndex("by_roomName", (q) => q.eq("roomName", args.roomName))
          .collect()
      ).filter((p) => p.identity === args.identity);
    }

    for (const m of matches) {
      await ctx.db.delete(m._id);
    }
  },
});

// Get active participants for a room (filter out stale entries older than 30s)
export const getParticipants = query({
  args: { roomName: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("voiceParticipants")
      .withIndex("by_roomName", (q) => q.eq("roomName", args.roomName))
      .collect();

    const now = Date.now();
    const active = rows.filter((r) => now - r.lastSeenAt < 30000);

    // Enrich with profile data when available
    const enriched = await Promise.all(
      active.map(async (p) => {
        const profile = p.profileId ? await ctx.db.get(p.profileId) : null;
        return { ...p, profile };
      })
    );

    return enriched;
  },
});