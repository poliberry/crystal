import { currentProfilePages } from "@/lib/current-profile-pages";
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

    const { notification, recipientId } = req.body;

    console.log(`[NOTIFICATIONS_SOCKET] Sending notification to user ${recipientId}`);

    // Emit socket event to specific user
    res?.socket?.server?.io?.to(`user:${recipientId}`).emit("notification:new", notification);

    console.log(`[NOTIFICATIONS_SOCKET] Notification sent successfully`);

    return res.status(200).json({ message: "Notification sent successfully." });
  } catch (error: unknown) {
    console.error("[NOTIFICATIONS_SOCKET_POST]: ", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
}
