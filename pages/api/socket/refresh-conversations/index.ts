import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiResponseServerIo } from "@/types";
import { NextApiRequest } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const profile = await currentProfilePages(req);

    if (!profile) return res.status(401).json({ error: "Unauthorized." });

    const { conversationId, type } = req.body;

    console.log(`[CONVERSATIONS_REFRESH] Triggering refresh - Type: ${type}, ConversationId: ${conversationId}`);

    // Emit socket event to refresh conversations for all connected clients
    res?.socket?.server?.io?.emit("conversations:refresh", {
      conversationId,
      type,
      timestamp: new Date().toISOString(),
    });

    console.log(`[CONVERSATIONS_REFRESH] Event emitted successfully`);

    return res.status(200).json({ message: "Conversations refresh triggered successfully." });
  } catch (error: unknown) {
    console.error("[REFRESH_CONVERSATIONS_POST]: ", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
}
