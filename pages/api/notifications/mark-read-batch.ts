import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const profile = await currentProfilePages(req);

      if (!profile) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { channelId, conversationId } = req.body;

      const whereClause: any = {
        profileId: profile.id,
        read: false,
        type: "MESSAGE",
      };

      if (channelId) {
        whereClause.channelId = channelId;
      } else if (conversationId) {
        whereClause.conversationId = conversationId;
      } else {
        return res.status(400).json({ error: "Either channelId or conversationId is required" });
      }

      const updatedNotifications = await db.notification.updateMany({
        where: whereClause,
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return res.status(200).json({ 
        message: "Notifications marked as read", 
        count: updatedNotifications.count 
      });
    } catch (error) {
      console.error("[NOTIFICATIONS_MARK_READ_BATCH]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
