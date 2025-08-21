import { type NextApiRequest } from "next";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { type NextApiResponseServerIo } from "@/types";
import { hasPermission, ServerPermission } from "@/lib/server-permissions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const profile = await currentProfilePages(req);
    const { action, targetUserId } = req.body;
    const { channelId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID is missing." });
    }

    const channel = await db.channel.findUnique({
      where: {
        id: channelId as string,
      },
      include: {
        server: {
          include: {
            members: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!channel || (channel.type as any) !== "STAGE") {
      return res.status(400).json({ error: "Invalid stage channel." });
    }

    const member = channel.server.members.find(
      (member) => member.profileId === profile.id
    );

    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    const channelKey = `channel:${channel.id}:stage`;

    // Handle different stage actions
    switch (action) {
      case "request_to_speak":
        if (!hasPermission(member.role, ServerPermission.REQUEST_TO_SPEAK)) {
          return res.status(403).json({ error: "No permission to request to speak." });
        }
        
        // Emit to channel that someone requested to speak
        res?.socket?.server?.io?.to(channelKey).emit("stage:update", {
          type: "speaker-request",
          channelId: channel.id,
          userId: profile.id,
          userName: profile.name,
        });
        
        return res.status(200).json({ success: true, message: "Speaker request sent" });

      case "approve_speaker":
        if (!hasPermission(member.role, ServerPermission.MANAGE_STAGE)) {
          return res.status(403).json({ error: "No permission to manage stage." });
        }
        
        // Emit to channel that speaker was approved
        res?.socket?.server?.io?.to(channelKey).emit("stage:update", {
          type: "speaker-approved",
          channelId: channel.id,
          userId: targetUserId,
          approvedBy: profile.id,
        });
        
        return res.status(200).json({ success: true, message: "Speaker approved" });

      case "remove_speaker":
        if (!hasPermission(member.role, ServerPermission.MANAGE_STAGE)) {
          return res.status(403).json({ error: "No permission to manage stage." });
        }
        
        // Emit to channel that speaker was removed
        res?.socket?.server?.io?.to(channelKey).emit("stage:update", {
          type: "speaker-removed",
          channelId: channel.id,
          userId: targetUserId,
          removedBy: profile.id,
        });
        
        return res.status(200).json({ success: true, message: "Speaker removed" });

      case "step_down":
        if (!hasPermission(member.role, ServerPermission.MANAGE_STAGE)) {
          return res.status(403).json({ error: "No permission to step down." });
        }
        
        // Emit to channel that moderator stepped down
        res?.socket?.server?.io?.to(channelKey).emit("stage:update", {
          type: "speaker-stepped-down",
          channelId: channel.id,
          userId: profile.id,
        });
        
        return res.status(200).json({ success: true, message: "Successfully stepped down from stage" });

      default:
        return res.status(400).json({ error: "Invalid action." });
    }
  } catch (error) {
    console.log("[STAGE_SOCKET]", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
}
