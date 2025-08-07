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

      const notifications = await db.notification.findMany({
        where: {
          profileId: profile.id,
        },
        include: {
          triggeredBy: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
          server: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
          channel: {
            select: {
              name: true,
            },
          },
          conversation: {
            select: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50, // Limit to last 50 notifications
      });

      return res.status(200).json(notifications);
    } catch (error) {
      console.error("[NOTIFICATIONS_GET]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
