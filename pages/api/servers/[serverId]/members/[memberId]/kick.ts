import { NextApiRequest, NextApiResponse } from "next";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    const { serverId, memberId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!serverId || !memberId) {
      return res.status(400).json({ error: "Server ID and Member ID are required" });
    }

    // Get the server and check if user is owner or has kick permissions
    const server = await db.server.findUnique({
      where: {
        id: serverId as string,
      },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const currentMember = server.members.find(
      (member) => member.profileId === profile.id
    );

    if (!currentMember) {
      return res.status(403).json({ error: "Not a member of this server" });
    }

    // Check if user is owner or has KICK_MEMBERS permission
    const isOwner = server.profileId === profile.id;
    const hasKickPermission = await PermissionManager.hasPermission(
      currentMember.id,
      PermissionType.KICK_MEMBERS
    );

    if (!isOwner && !hasKickPermission.granted) {
      return res.status(403).json({ error: "You don't have permission to kick members" });
    }

    const memberToKick = server.members.find(
      (member) => member.id === memberId
    );

    if (!memberToKick) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Can't kick the server owner
    if (memberToKick.profileId === server.profileId) {
      return res.status(403).json({ error: "Cannot kick the server owner" });
    }

    // Can't kick yourself
    if (memberToKick.profileId === profile.id) {
      return res.status(403).json({ error: "Cannot kick yourself" });
    }

    // Remove the member from the server
    await db.member.delete({
      where: {
        id: memberId as string,
      },
    });

    return res.status(200).json({ message: "Member kicked successfully" });
  } catch (error) {
    console.error("[KICK_MEMBER]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
