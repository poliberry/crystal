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

      // Track what changed
      let statusChanged = false;
      let presenceChanged = false;
      let updatedProfile = profile;

      if (status && status !== profile.status) {
        await db.profile.update({
          where: { id: profile.id },
          data: { status: status }
        });
        const newProfile = await db.profile.findUnique({
          where: { id: profile.id }
        });
        if (newProfile) {
          updatedProfile = newProfile;
          statusChanged = true;
        }
      } else if (presenceStatus !== undefined && presenceStatus !== profile.presenceStatus) {
        const newProfile = await db.profile.update({
          where: { id: profile.id },
          data: { presenceStatus: presenceStatus }
        });
        if (newProfile) {
          updatedProfile = newProfile;
          presenceChanged = true;
        }
      }

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

          // Emit to global presence channel for conversations and general status
          await pusherServer.trigger("presence", "user:status:update", eventData);
          await pusherServer.trigger("presence", "user:presence:update", eventData);
          await pusherServer.trigger("presence", "presence-status-update", eventData);
          await pusherServer.trigger("presence", "members:poll", { timestamp: Date.now() });

          // Get user's servers and emit to server-specific channels
          const userServers = await db.member.findMany({
            where: { profileId: profile.id },
            select: { serverId: true }
          });

          // Emit to each server the user is a member of
          for (const member of userServers) {
            await pusherServer.trigger(`presence-server-${member.serverId}`, "user-status-update", eventData);
            await pusherServer.trigger(`presence-server-${member.serverId}`, "presence-update", eventData);
          }

          console.log(`[DISCORD_STATUS_API] Updated presence via Pusher for ${profile.userId} across ${userServers.length} servers:`, {
            status: profile.status + " -> " + updatedProfile.status,
            presenceStatus: (profile.presenceStatus || "") + " -> " + (updatedProfile.presenceStatus || "")
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
