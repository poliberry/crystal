import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple password hashing function using Web Crypto API
// Note: In production, you should use bcrypt or similar for better security
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingProfile) {
      throw new Error("User with this email already exists");
    }

    const now = Date.now();
    const passwordHash = await hashPassword(args.password);
    const userId = crypto.randomUUID();

    const profileId = await ctx.db.insert("profiles", {
      userId,
      email: args.email,
      name: args.name || args.email.split("@")[0],
      globalName: args.name || args.email.split("@")[0],
      imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${args.email}`,
      passwordHash,
      status: "ONLINE",
      createdAt: now,
      updatedAt: now,
    });

    return { 
      profileId: profileId.toString(),
      userId,
      email: args.email, 
      name: args.name || args.email.split("@")[0],
    };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!profile) {
      throw new Error("Invalid email or password");
    }

    if (!profile.passwordHash) {
      throw new Error("Invalid email or password");
    }

    const passwordHash = await hashPassword(args.password);
    if (profile.passwordHash !== passwordHash) {
      throw new Error("Invalid email or password");
    }

    return {
      profileId: profile._id.toString(),
      userId: profile.userId,
      email: profile.email,
      name: profile.name,
      globalName: profile.globalName,
      imageUrl: profile.imageUrl,
      status: profile.status,
    };
  },
});
