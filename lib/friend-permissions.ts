import { db } from "./db";

// Check if user can send DMs to another user based on friend settings
export const canSendDirectMessage = async (
  senderProfileId: string,
  receiverProfileId: string
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    // Get receiver's settings
    const receiverProfile = await db.profile.findUnique({
      where: { id: receiverProfileId },
      select: {
        allowNonFriendDMs: true,
        friendRequestPrivacy: true
      }
    });

    if (!receiverProfile) {
      return { allowed: false, reason: "User not found" };
    }

    // If receiver allows DMs from non-friends, allow
    if ((receiverProfile as any).allowNonFriendDMs) {
      return { allowed: true };
    }

    // Check if users are blocked
    const block = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: senderProfileId, blockedId: receiverProfileId },
          { blockerId: receiverProfileId, blockedId: senderProfileId }
        ]
      }
    });

    if (block) {
      return { allowed: false, reason: "User is blocked" };
    }

    // Check if users are friends
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: senderProfileId, receiverId: receiverProfileId, status: "ACCEPTED" },
          { requesterId: receiverProfileId, receiverId: senderProfileId, status: "ACCEPTED" }
        ]
      }
    });

    if (friendship) {
      return { allowed: true };
    }

    // If not friends and receiver doesn't allow non-friend DMs
    return { allowed: false, reason: "User only accepts messages from friends" };
  } catch (error) {
    console.error("Error checking DM permissions:", error);
    return { allowed: false, reason: "Error checking permissions" };
  }
};

// Check friend status between two users
export const getFriendshipStatus = async (
  profileOneId: string,
  profileTwoId: string
): Promise<{
  status: "none" | "pending_sent" | "pending_received" | "friends" | "blocked_by_them" | "blocked_by_you";
  friendshipId?: string;
  blockId?: string;
}> => {
  try {
    // Check for blocks first
    const block = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: profileOneId, blockedId: profileTwoId },
          { blockerId: profileTwoId, blockedId: profileOneId }
        ]
      }
    });

    if (block) {
      if (block.blockerId === profileOneId) {
        return { status: "blocked_by_you", blockId: block.id };
      } else {
        return { status: "blocked_by_them", blockId: block.id };
      }
    }

    // Check friendship
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: profileOneId, receiverId: profileTwoId },
          { requesterId: profileTwoId, receiverId: profileOneId }
        ]
      }
    });

    if (!friendship) {
      return { status: "none" };
    }

    if (friendship.status === "ACCEPTED") {
      return { status: "friends", friendshipId: friendship.id };
    }

    if (friendship.status === "PENDING") {
      if (friendship.requesterId === profileOneId) {
        return { status: "pending_sent", friendshipId: friendship.id };
      } else {
        return { status: "pending_received", friendshipId: friendship.id };
      }
    }

    return { status: "none" };
  } catch (error) {
    console.error("Error checking friendship status:", error);
    return { status: "none" };
  }
};
