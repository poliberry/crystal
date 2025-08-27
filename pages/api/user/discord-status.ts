import { NextApiRequest, NextApiResponse } from "next";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { UserStatus } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const profile = await currentProfilePages(req);
    
    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "GET") {
      // Return current status and custom status
      return res.status(200).json({
        status: profile.status,
        presenceStatus: profile.presenceStatus
      });
    }

    if (req.method === "POST") {
      const { status, presenceStatus } = req.body;

      // Validate status if provided
      if (status && !Object.values(UserStatus).includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      // Build update data
      const updateData: any = {};
      let statusChanged = false;
      let presenceChanged = false;

      if (status && status !== profile.status) {
        updateData.status = status;
        updateData.prevStatus = profile.status;
        statusChanged = true;
      }

      if (presenceStatus !== undefined && presenceStatus !== profile.presenceStatus) {
        updateData.presenceStatus = presenceStatus || null;
        presenceChanged = true;
      }

      // Update database if there are changes
      let updatedProfile = profile;
      if (Object.keys(updateData).length > 0) {
        updatedProfile = await db.profile.update({
          where: { id: profile.id },
          data: updateData
        });
      }

      // Emit websocket events for real-time updates
      // Emit real-time updates via Pusher
      if (statusChanged || presenceChanged) {
        try {
          const eventData = {
            userId: profile.userId,
            profileId: profile.id,
            status: updatedProfile.status,
            presenceStatus: updatedProfile.presenceStatus,
            prevStatus: updatedProfile.prevStatus
          };

          // Emit multiple events for compatibility
          await pusherServer.trigger("presence", "user:status:update", eventData);
          await pusherServer.trigger("presence", "user:presence:update", eventData);
          await pusherServer.trigger("presence", "presence-status-update", eventData);
          await pusherServer.trigger("presence", "members:poll", { timestamp: Date.now() });

          console.log(`[DISCORD_STATUS_API] Updated presence via Pusher for ${profile.userId}:`, {
            status: profile.status + " -> " + updatedProfile.status,
            presenceStatus: profile.presenceStatus + " -> " + updatedProfile.presenceStatus
          });
        } catch (pusherError) {
          console.error("[PUSHER_ERROR] Failed to emit discord status update:", pusherError);
        }
      }

      return res.status(200).json({
        status: updatedProfile.status,
        presenceStatus: updatedProfile.presenceStatus
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[DISCORD_STATUS_API] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
