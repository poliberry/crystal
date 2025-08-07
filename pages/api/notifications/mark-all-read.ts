import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "PATCH") {
    try {
      const profile = await currentProfilePages(req);

      if (!profile) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await db.notification.updateMany({
        where: {
          profileId: profile.id,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("[NOTIFICATIONS_MARK_ALL_READ]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
