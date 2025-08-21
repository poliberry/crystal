import type { NextApiRequest } from "next";
import { currentProfilePages } from "@/lib/current-profile-pages";
import type { NextApiResponseServerIo } from "@/types";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const profile = await currentProfilePages(req);
    const { friendshipId, action } = req.body; // "accept", "decline", "cancel"

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (!friendshipId || !action || !["accept", "decline", "cancel"].includes(action)) {
      return res.status(400).json({ error: "Invalid parameters." });
    }

    // Find the friendship
    const friendship = await db.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: true,
        receiver: true
      }
    });

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    // Check permissions
    if (action === "cancel" && friendship.requesterId !== profile.id) {
      return res.status(403).json({ error: "Can only cancel your own requests." });
    }

    if ((action === "accept" || action === "decline") && friendship.receiverId !== profile.id) {
      return res.status(403).json({ error: "Can only respond to requests sent to you." });
    }

    if (friendship.status !== "PENDING") {
      return res.status(400).json({ error: "Request is no longer pending." });
    }

    let newStatus;
    if (action === "accept") {
      newStatus = "ACCEPTED";
    } else if (action === "decline") {
      newStatus = "DECLINED";
    } else {
      newStatus = "CANCELLED";
    }

    // Update friendship status
    const updatedFriendship = await db.friendship.update({
      where: { id: friendshipId },
      data: { status: newStatus as any },
      include: {
        requester: true,
        receiver: true
      }
    });

    // Emit to both users
    const requesterKey = `user:${friendship.requesterId}`;
    const receiverKey = `user:${friendship.receiverId}`;

    res?.socket?.server?.io?.to(requesterKey).emit("friend:request:updated", {
      friendship: updatedFriendship,
      action
    });

    res?.socket?.server?.io?.to(receiverKey).emit("friend:request:updated", {
      friendship: updatedFriendship,
      action
    });

    // Create notification for the other user if accepted
    if (action === "accept") {
      await db.notification.create({
        data: {
          type: "FRIEND_REQUEST",
          title: "Friend Request Accepted",
          content: `${profile.globalName || profile.name} accepted your friend request`,
          profileId: friendship.requesterId,
          triggeredById: profile.id
        }
      });
    }

    return res.status(200).json(updatedFriendship);
  } catch (error) {
    console.error("[SOCKET_FRIEND_RESPONSE]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
