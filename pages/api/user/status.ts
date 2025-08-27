import { NextApiRequest, NextApiResponse } from "next";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { UserStatus } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

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

      return res.status(200).json({
        status: profile.status,
        prevStatus: profile.prevStatus,
        presenceStatus: profile.presenceStatus,
        isDND: profile.status === UserStatus.DND
      });
    } catch (error) {
      console.error("[USER_STATUS_GET]", error);
      return res.status(500).json({ error: "Internal Error" });
    }
  }

  if (req.method === "POST") {
    try {
      const profile = await currentProfilePages(req);
      
      if (!profile) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { status, presenceStatus } = req.body;

      const updateData: any = {};
      
      if (status && Object.values(UserStatus).includes(status)) {
        updateData.prevStatus = profile.status;
        updateData.status = status;
      }

      if (presenceStatus !== undefined) {
        updateData.presenceStatus = presenceStatus || null;
      }

      const updatedProfile = await db.profile.update({
        where: { id: profile.id },
        data: updateData
      });

      // Emit real-time updates via Pusher
      try {
        // Only emit status update if status actually changed
        if (status && status !== profile.status) {
          await pusherServer.trigger("presence", "user:status:update", {
            userId: profile.userId,
            status: updatedProfile.status,
            presenceStatus: updatedProfile.presenceStatus,
            prevStatus: updatedProfile.prevStatus,
          });
          
          console.log(`[PUSHER_STATUS_UPDATE] User ${profile.userId} status changed from ${profile.status} to ${updatedProfile.status}`);
        }

        // Only emit presence update if presence status actually changed
        if (presenceStatus !== undefined && presenceStatus !== profile.presenceStatus) {
          await pusherServer.trigger("presence", "user:presence:update", {
            userId: profile.userId,
            presenceStatus: updatedProfile.presenceStatus,
            status: updatedProfile.status,
            prevStatus: updatedProfile.prevStatus,
          });
          
          console.log(`[PUSHER_PRESENCE_UPDATE] User ${profile.userId} presence changed from ${profile.presenceStatus} to ${updatedProfile.presenceStatus}`);
        }

        // Only emit the combined update if either status changed
        if ((status && status !== profile.status) || (presenceStatus !== undefined && presenceStatus !== profile.presenceStatus)) {
          await pusherServer.trigger("presence", "presence-status-update", {
            profileId: profile.id,
            userId: profile.userId,
            status: updatedProfile.status,
            presenceStatus: updatedProfile.presenceStatus,
            prevStatus: updatedProfile.prevStatus,
          });
        }

        // Trigger member list updates
        await pusherServer.trigger("presence", "members:poll", {
          timestamp: Date.now(),
        });
      } catch (pusherError) {
        console.error("[PUSHER_ERROR]", pusherError);
        // Don't fail the request if Pusher fails
      }

      return res.status(200).json({
        status: updatedProfile.status,
        prevStatus: updatedProfile.prevStatus,
        presenceStatus: updatedProfile.presenceStatus,
        isDND: updatedProfile.status === UserStatus.DND
      });
    } catch (error) {
      console.error("[USER_STATUS_POST]", error);
      return res.status(500).json({ error: "Internal Error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
