import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const profile = await currentProfilePages(req);

      if (!profile) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { channelId, conversationId, serverId, type } = req.query;

      let count = 0;

      if (type === "channel" && channelId) {
        count = await db.notification.count({
          where: {
            profileId: profile.id,
            channelId: channelId as string,
            read: false,
            type: "MESSAGE",
          },
        });
      } else if (type === "conversation" && conversationId) {
        count = await db.notification.count({
          where: {
            profileId: profile.id,
            conversationId: conversationId as string,
            read: false,
            type: "MESSAGE",
          },
        });
      } else if (type === "server" && serverId) {
        count = await db.notification.count({
          where: {
            profileId: profile.id,
            serverId: serverId as string,
            read: false,
            type: "MESSAGE",
          },
        });
      } else if (type === "total-conversations") {
        // Get count of conversations with unread messages
        const unreadConversations = await db.notification.findMany({
          where: {
            profileId: profile.id,
            conversationId: { not: null },
            read: false,
            type: "MESSAGE",
          },
          select: {
            conversationId: true,
          },
          distinct: ["conversationId"],
        });
        count = unreadConversations.length;
      } else {
        // Total unread count
        count = await db.notification.count({
          where: {
            profileId: profile.id,
            read: false,
          },
        });
      }

      return res.status(200).json({ count });
    } catch (error) {
      console.error("[NOTIFICATIONS_COUNT_GET]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
