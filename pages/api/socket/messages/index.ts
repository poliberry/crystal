import { type NextApiRequest } from "next";

import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { type NextApiResponseServerIo } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo,
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed." });

  try {
    const profile = await currentProfilePages(req);
    const { content, attachments } = req.body;
    const { serverId, channelId } = req.query;

    if (!profile) return res.status(401).json({ error: "Unauthorized." });
    if (!serverId)
      return res.status(400).json({ error: "Server ID is missing." });
    if (!channelId)
      return res.status(400).json({ error: "Channel ID is missing." });

    const server = await db.server.findFirst({
      where: {
        id: serverId as string,
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
      include: {
        members: true,
      },
    });

    if (!server) return res.status(404).json({ message: "Server not found." });

    const channel = await db.channel.findFirst({
      where: {
        id: channelId as string,
        serverId: serverId as string,
      },
    });

    if (!channel)
      return res.status(404).json({ message: "Channel not found." });

    const member = server.members.find(
      (member) => member.profileId === profile.id,
    );

    if (!member) return res.status(404).json({ message: "Member not found." });

    const message = await db.message.create({
      data: {
        content: content || "",
        channelId: channelId as string,
        memberId: member.id,
        attachments: {
          create: attachments?.map((attachment: { url: string; name: string, utId: string }) => ({
            url: attachment.url,
            name: attachment.name,
            utId: attachment.utId, // Assuming utId is part of the attachment
          })) || [],
        }
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
        attachments: true, // include attachments in the response
      },
    });

    const channelKey = `chat:${channelId}:messages`;

    res?.socket?.server?.io?.emit(channelKey, message);

    // Create notifications for other members in the server channel
    const otherMembers = server.members.filter(
      (serverMember) => serverMember.profileId !== profile.id
    );

    for (const serverMember of otherMembers) {
      try {
        const notification = await db.notification.create({
          data: {
            type: "MESSAGE",
            title: `${profile.name} (#${channel.name} / ${server.name})`,
            content: content?.length > 100 ? content.substring(0, 100) + "..." : (content || ""),
            profileId: serverMember.profileId,
            triggeredById: profile.id,
            serverId: serverId as string,
            channelId: channelId as string,
            read: false,
          },
          include: {
            triggeredBy: true,
            server: true,
            channel: true,
          },
        });

        // Emit notification to the user's specific room
        res?.socket?.server?.io?.to(`user:${serverMember.profileId}`).emit("notification:new", notification);
      } catch (notificationError) {
        console.error(`Failed to create notification for user ${serverMember.profileId}:`, notificationError);
      }
    }

    return res.status(200).json(message);
  } catch (error: unknown) {
    console.error("[MESSAGES_POST]: ", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
}
