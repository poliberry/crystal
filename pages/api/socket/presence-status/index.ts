import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiResponseServerIo } from "@/types";
import { NextApiRequest } from "next";
import { UserStatus } from "@prisma/client";

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

    const { status, presenceStatus } = req.body;

    // Get current profile state for comparison
    const currentProfile = await db.profile.findUnique({
        where: { id: profile.id },
        select: { status: true, presenceStatus: true }
    });

    if (!currentProfile) {
        return res.status(404).json({ error: "Profile not found" });
    }

    // Store previous status before updating
    const updateData: any = {};
    
    // If status is provided, it should be a UserStatus enum value
    if (status && Object.values(UserStatus).includes(status)) {
      updateData.prevStatus = profile.status;
      updateData.status = status;
    }
    
    // If presenceStatus is provided, it's the custom message
    if (presenceStatus !== undefined) {
      updateData.presenceStatus = presenceStatus || null;
    }

    // Update the user's presence status in the database
    const updatedProfile = await db.profile.update({
      where: {
        id: profile.id,
      },
      data: updateData,
    });

    // Only emit if something actually changed
    const statusChanged = status && status !== currentProfile.status;
    const presenceChanged = (presenceStatus !== undefined) && (presenceStatus !== currentProfile.presenceStatus);

    if (statusChanged || presenceChanged) {
        // Emit the updated presence status to all connected clients
        res?.socket?.server?.io?.emit("user:presence:update", {
            userId: profile.userId,
            presenceStatus: updatedProfile.presenceStatus,
            status: updatedProfile.status,
            prevStatus: updatedProfile.prevStatus,
        });

        // Also emit status update if status changed
        if (statusChanged) {
            res?.socket?.server?.io?.emit("user:status:update", {
                userId: profile.userId,
                status: updatedProfile.status,
                presenceStatus: updatedProfile.presenceStatus,
                prevStatus: updatedProfile.prevStatus,
            });
        }

        // Emit combined update
        res?.socket?.server?.io?.emit("presence-status-update", {
            profileId: profile.id,
            userId: profile.userId,
            status: updatedProfile.status,
            presenceStatus: updatedProfile.presenceStatus,
            prevStatus: updatedProfile.prevStatus,
        });

        // Trigger member list updates
        res?.socket?.server?.io?.emit("members:poll");

        console.log(`[SOCKET_PRESENCE_UPDATE] User ${profile.userId} status: ${currentProfile.status} -> ${updatedProfile.status}, presence: ${currentProfile.presenceStatus} -> ${updatedProfile.presenceStatus}`);
    }

    return res.status(200).json({ 
      message: "Presence status updated successfully.",
      status: updatedProfile.status,
      presenceStatus: updatedProfile.presenceStatus 
    });
  } catch (error: unknown) {
    console.error("[PRESENCE_STATUS_POST]: ", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
}
