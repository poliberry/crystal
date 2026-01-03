"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { AccessToken } from "livekit-server-sdk";

// Get LiveKit access token
export const getToken = action({
  args: {
    room: v.string(),
    username: v.string(),
    avatar: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get profile using a query (actions can't access db directly)
    const profile = args.userId 
      ? await ctx.runQuery(api.profiles.getCurrent, { userId: args.userId })
      : null;
    
    if (!profile) {
      throw new Error("Profile not found");
    }
    
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error(
        "LiveKit not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables in Convex. " +
        "Run: npx convex env set LIVEKIT_API_KEY <your-key> && npx convex env set LIVEKIT_API_SECRET <your-secret>"
      );
    }

    const at = new AccessToken(apiKey, apiSecret, { identity: args.username });

    if (args.avatar) {
      at.metadata = JSON.stringify({
        avatar: args.avatar,
      });
    }

    at.addGrant({ 
      room: args.room, 
      roomJoin: true, 
      canPublish: true, 
      canSubscribe: true 
    });

    return { token: await at.toJwt() };
  },
});

// Get room participants (requires LiveKit server SDK)
// Note: This requires the LiveKit server SDK which needs to run server-side
// For now, we'll keep the API route for this, but you can migrate it to Convex actions
// if you set up the LiveKit server SDK properly in Convex

