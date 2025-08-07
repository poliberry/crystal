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

    // Find and mark conversation notifications as read
    await db.notification.updateMany({
      where: {
        profileId: profile.id,
        conversationId: conversationId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    // Emit socket event to all clients for this user to update UI
    res?.socket?.server?.io?.to(`user:${profile.id}`)?.emit("conversation:scrolled-to-bottom", {
      conversationId,
      profileId: profile.id,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.log("[CONVERSATION_SCROLL_ERROR]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
