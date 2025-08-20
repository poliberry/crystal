import type { NextApiRequest } from "next";
import type { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID missing" });
    }

    // Mark all unread notifications for this conversation as read
    const updatedNotifications = await db.notification.updateMany({
      where: {
        profileId: profile.id,
        conversationId: conversationId,
        read: false,
        type: "MESSAGE",
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    // Emit socket event to update UI in real-time
    res?.socket?.server?.io?.to(`user:${profile.id}`)?.emit("conversation:marked-as-read", {
      conversationId,
      profileId: profile.id,
      count: updatedNotifications.count,
    });

    return res.status(200).json({ 
      message: "Conversation marked as read", 
      count: updatedNotifications.count 
    });
  } catch (error) {
    console.log("[CONVERSATION_MARK_READ_ERROR]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
