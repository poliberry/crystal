import type { NextApiRequest } from "next";
import { currentProfilePages } from "@/lib/current-profile-pages";
import type { NextApiResponseServerIo } from "@/types";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const profile = await currentProfilePages(req);
    const { targetUserId } = req.body;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID required." });
    }

    if (targetUserId === profile.id) {
      return res.status(400).json({ error: "Cannot send friend request to yourself." });
    }

    // Check if target user exists
    const targetUser = await db.profile.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if user is blocked
    const isBlocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: profile.id, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: profile.id }
        ]
      }
    });

    if (isBlocked) {
      return res.status(403).json({ error: "Cannot send friend request to blocked user." });
    }

    // Check privacy settings
    if ((targetUser as any).friendRequestPrivacy === "none") {
      return res.status(403).json({ error: "User is not accepting friend requests." });
    }

    // Check if friendship already exists
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: profile.id, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: profile.id }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === "ACCEPTED") {
        return res.status(400).json({ error: "Already friends." });
      }
      if (existingFriendship.status === "PENDING") {
        return res.status(400).json({ error: "Friend request already sent." });
      }
    }

    // Create friend request
    const friendship = await db.friendship.create({
      data: {
        requesterId: profile.id,
        receiverId: targetUserId,
        status: "PENDING"
      },
      include: {
        requester: true,
        receiver: true
      }
    });

    // Emit to target user's notification room
    const targetKey = `user:${targetUserId}`;
    res?.socket?.server?.io?.to(targetKey).emit("friend:request:received", {
      friendship,
      requester: profile
    });

    // Emit to sender's notification room
    const senderKey = `user:${profile.id}`;
    res?.socket?.server?.io?.to(senderKey).emit("friend:request:sent", {
      friendship,
      receiver: targetUser
    });

    // Create notification for target user
    await db.notification.create({
      data: {
        type: "FRIEND_REQUEST",
        title: "New Friend Request",
        content: `${profile.globalName || profile.name} sent you a friend request`,
        profileId: targetUserId,
        triggeredById: profile.id
      }
    });

    return res.status(200).json(friendship);
  } catch (error) {
    console.error("[SOCKET_FRIEND_REQUEST]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
