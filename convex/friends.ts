import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentProfile, requireProfile } from "./lib/helpers";

// Get all friends for a user
export const getFriends = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
    const profile = await getCurrentProfile(ctx, args.userId);
    if (!profile) return [];
    
    // Get all accepted friend relationships where user is requester or addressee
    const asRequester = await ctx.db
      .query("friends")
      .withIndex("by_requesterId", (q: any) => q.eq("requesterId", profile._id))
      .filter((q: any) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();
    
    const asAddressee = await ctx.db
      .query("friends")
      .withIndex("by_addresseeId", (q: any) => q.eq("addresseeId", profile._id))
      .filter((q: any) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();
    
    // Get friend profiles
    const friendIds = [
      ...asRequester.map((f) => f.addresseeId),
      ...asAddressee.map((f) => f.requesterId),
    ];
    
    const friends = await Promise.all(
      friendIds.map(async (friendId) => {
        const friendProfile = await ctx.db.get(friendId);
        return friendProfile;
      })
    );
    
    return friends.filter(Boolean);
  },
});

// Get online friends
export const getOnlineFriends = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
    const profile = await getCurrentProfile(ctx, args.userId);
    if (!profile) return [];
    
    // Get all accepted friend relationships where user is requester or addressee
    const asRequester = await ctx.db
      .query("friends")
      .withIndex("by_requesterId", (q: any) => q.eq("requesterId", profile._id))
      .filter((q: any) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();
    
    const asAddressee = await ctx.db
      .query("friends")
      .withIndex("by_addresseeId", (q: any) => q.eq("addresseeId", profile._id))
      .filter((q: any) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();
    
    // Get friend profiles
    const friendIds = [
      ...asRequester.map((f) => f.addresseeId),
      ...asAddressee.map((f) => f.requesterId),
    ];
    
    const friends = await Promise.all(
      friendIds.map(async (friendId) => {
        const friendProfile = await ctx.db.get(friendId);
        return friendProfile;
      })
    );
    
    // Filter to only online friends
    return friends.filter(
      (friend: any) =>
        friend &&
        friend.status !== "OFFLINE" &&
        friend.status !== "INVISIBLE"
    );
  },
});

// Get pending friend requests (sent by user)
export const getPendingSent = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
    const profile = await getCurrentProfile(ctx, args.userId);
    if (!profile) return [];
    
    const requests = await ctx.db
      .query("friends")
      .withIndex("by_requesterId", (q: any) => q.eq("requesterId", profile._id))
      .filter((q: any) => q.eq(q.field("status"), "PENDING"))
      .collect();
    
    const profiles = await Promise.all(
      requests.map(async (req) => await ctx.db.get(req.addresseeId))
    );
    
    return profiles.filter(Boolean);
  },
});

// Get pending friend requests (received by user)
export const getPendingReceived = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
    const profile = await getCurrentProfile(ctx, args.userId);
    if (!profile) return [];
    
    const requests = await ctx.db
      .query("friends")
      .withIndex("by_addresseeId", (q: any) => q.eq("addresseeId", profile._id))
      .filter((q: any) => q.eq(q.field("status"), "PENDING"))
      .collect();
    
    const profiles = await Promise.all(
      requests.map(async (req) => await ctx.db.get(req.requesterId))
    );
    
    return profiles.filter(Boolean);
  },
});

// Send friend request
export const sendRequest = mutation({
  args: {
    userId: v.optional(v.string()),
    friendUserId: v.string(), // userId of the friend to add
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const friendProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.friendUserId))
      .first();
    
    if (!friendProfile) {
      throw new Error("User not found");
    }
    
    if (profile._id === friendProfile._id) {
      throw new Error("Cannot add yourself as a friend");
    }
    
    // Check if relationship already exists
    const existing = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", profile._id).eq("addresseeId", friendProfile._id)
      )
      .first();
    
    if (existing) {
      if (existing.status === "ACCEPTED") {
        throw new Error("Already friends");
      }
      if (existing.status === "BLOCKED") {
        throw new Error("Cannot send request to blocked user");
      }
      // Update existing pending request
      await ctx.db.patch(existing._id, {
        status: "PENDING",
        updatedAt: Date.now(),
      });
      return existing;
    }
    
    // Check reverse relationship
    const reverse = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", friendProfile._id).eq("addresseeId", profile._id)
      )
      .first();
    
    if (reverse) {
      if (reverse.status === "ACCEPTED") {
        throw new Error("Already friends");
      }
      if (reverse.status === "BLOCKED") {
        throw new Error("Cannot send request to blocked user");
      }
    }
    
    const friendId = await ctx.db.insert("friends", {
      requesterId: profile._id,
      addresseeId: friendProfile._id,
      status: "PENDING",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(friendId);
  },
});

// Accept friend request
export const acceptRequest = mutation({
  args: {
    userId: v.optional(v.string()),
    friendUserId: v.string(), // userId of the friend who sent the request
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const friendProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.friendUserId))
      .first();
    
    if (!friendProfile) {
      throw new Error("User not found");
    }
    
    // Find the pending request
    const request = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", friendProfile._id).eq("addresseeId", profile._id)
      )
      .first();
    
    if (!request) {
      throw new Error("Friend request not found");
    }
    
    if (request.status !== "PENDING") {
      throw new Error("Request is not pending");
    }
    
    await ctx.db.patch(request._id, {
      status: "ACCEPTED",
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(request._id);
  },
});

// Reject/Remove friend
export const removeFriend = mutation({
  args: {
    userId: v.optional(v.string()),
    friendUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const friendProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.friendUserId))
      .first();
    
    if (!friendProfile) {
      throw new Error("User not found");
    }
    
    // Find relationship in either direction
    const relationship = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", profile._id).eq("addresseeId", friendProfile._id)
      )
      .first();
    
    const reverseRelationship = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", friendProfile._id).eq("addresseeId", profile._id)
      )
      .first();
    
    const toDelete = relationship || reverseRelationship;
    
    if (toDelete) {
      await ctx.db.delete(toDelete._id);
    }
  },
});

// Block user
export const blockUser = mutation({
  args: {
    userId: v.optional(v.string()),
    blockUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const blockProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.blockUserId))
      .first();
    
    if (!blockProfile) {
      throw new Error("User not found");
    }
    
    // Check if relationship exists
    const existing = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", profile._id).eq("addresseeId", blockProfile._id)
      )
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "BLOCKED",
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("friends", {
        requesterId: profile._id,
        addresseeId: blockProfile._id,
        status: "BLOCKED",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Unblock user
export const unblockUser = mutation({
  args: {
    userId: v.optional(v.string()),
    unblockUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx, args.userId);
    const unblockProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.unblockUserId))
      .first();
    
    if (!unblockProfile) {
      throw new Error("User not found");
    }
    
    const relationship = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", profile._id).eq("addresseeId", unblockProfile._id)
      )
      .first();
    
    if (relationship && relationship.status === "BLOCKED") {
      await ctx.db.delete(relationship._id);
    }
  },
});

// Check if two users are friends
export const areFriends = query({
  args: {
    userId: v.optional(v.string()),
    otherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userId) return false;
    
    const profile = await getCurrentProfile(ctx, args.userId);
    const otherProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.otherUserId))
      .first();
    
    if (!profile || !otherProfile) return false;
    
    const relationship = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", profile._id).eq("addresseeId", otherProfile._id)
      )
      .first();
    
    const reverseRelationship = await ctx.db
      .query("friends")
      .withIndex("by_requesterId_addresseeId", (q: any) =>
        q.eq("requesterId", otherProfile._id).eq("addresseeId", profile._id)
      )
      .first();
    
    return (
      (relationship?.status === "ACCEPTED") ||
      (reverseRelationship?.status === "ACCEPTED")
    );
  },
});

