import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
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

    const { presenceStatus } = req.body;

    // Update the user's presence status in the database
    const updatedProfile = await db.profile.update({
      where: {
        id: profile.id,
      },
      data: {
        presenceStatus: presenceStatus || null, // Allow clearing the status
      },
    });

    // Emit the updated presence status to all connected clients
    res?.socket?.server?.io?.emit("user:presence:update", {
      userId: profile.userId,
      presenceStatus: updatedProfile.presenceStatus,
    });

    return res.status(200).json({ 
      message: "Presence status updated successfully.",
      presenceStatus: updatedProfile.presenceStatus 
    });
  } catch (error: unknown) {
    console.error("[PRESENCE_STATUS_POST]: ", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
}
