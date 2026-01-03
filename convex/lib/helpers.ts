import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Get the current authenticated user's profile
 * Returns null if not authenticated or profile doesn't exist
 * Requires userId to be passed (from localStorage on client)
 */
export async function getCurrentProfile(
  ctx: QueryCtx | MutationCtx,
  userId?: string
) {
  if (!userId) {
    return null;
  }

  // Find profile by userId
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  return profile;
}

/**
 * Get or create the current user's profile
 * Creates a new profile if one doesn't exist
 * Requires userId to be passed
 */
export async function getOrCreateProfile(
  ctx: MutationCtx,
  userId: string,
  userData?: {
    name?: string;
    email?: string;
    imageUrl?: string;
  }
) {
  if (!userId) {
    return null;
  }

  let profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!profile) {
    const now = Date.now();
    const profileId = await ctx.db.insert("profiles", {
      userId,
      name: userData?.name || "Unnamed",
      email: userData?.email || "",
      imageUrl: userData?.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      status: "OFFLINE",
      createdAt: now,
      updatedAt: now,
    });
    profile = await ctx.db.get(profileId);
  }

  return profile;
}

/**
 * Require authentication - throws if not authenticated
 * Requires userId to be passed
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  userId?: string
) {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return { subject: userId };
}

/**
 * Require profile - throws if not authenticated or profile doesn't exist
 * Requires userId to be passed (from localStorage on client)
 */
export async function requireProfile(
  ctx: QueryCtx | MutationCtx,
  userId?: string
) {
  const profile = await getCurrentProfile(ctx, userId);
  
  if (!profile) {
    throw new Error("Profile not found");
  }

  return profile;
}

