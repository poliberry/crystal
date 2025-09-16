import { NextApiRequest, NextApiResponse } from "next";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
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

    // Get the server and check if user is owner or has ban permissions
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

    // Check if user is owner or has BAN_MEMBERS permission
    const isOwner = server.profileId === profile.id;
    const hasBanPermission = await PermissionManager.hasPermission(
      currentMember.id,
      PermissionType.BAN_MEMBERS
    );

    if (!isOwner && !hasBanPermission.granted) {
      return res.status(403).json({ error: "You don't have permission to ban members" });
    }

    const memberToBan = server.members.find(
      (member) => member.id === memberId
    );

    if (!memberToBan) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Can't ban the server owner
    if (memberToBan.profileId === server.profileId) {
      return res.status(403).json({ error: "Cannot ban the server owner" });
    }

    // Can't ban yourself
    if (memberToBan.profileId === profile.id) {
      return res.status(403).json({ error: "Cannot ban yourself" });
    }

    // Create a ban record and remove the member
    await db.$transaction(async (tx) => {
      // For now, just remove the member - ban table needs migration
      // TODO: Add ban record once migration is complete
      
      // Remove the member from the server
      await tx.member.delete({
        where: {
          id: memberId as string,
        },
      });
    });

    return res.status(200).json({ message: "Member banned successfully" });
  } catch (error) {
    console.error("[BAN_MEMBER]", error);
    return res.status(500).json({ error: "Internal Error" });
  }
}
