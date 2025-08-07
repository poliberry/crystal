import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { notificationId } = req.query;

  if (req.method === "PATCH") {
    try {
      const profile = await currentProfilePages(req);

      if (!profile) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const notification = await db.notification.update({
        where: {
          id: notificationId as string,
          profileId: profile.id,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return res.status(200).json(notification);
    } catch (error) {
      console.error("[NOTIFICATION_MARK_READ]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
