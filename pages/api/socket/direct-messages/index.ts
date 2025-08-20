import { type NextApiRequest } from "next";

import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { type NextApiResponseServerIo } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed." });

  try {
    const profile = await currentProfilePages(req);
    const { content, fileUrl, attachments } = req.body;
    const { conversationId } = req.query;

    console.log("Direct Messages API called with:", {
      conversationId,
      content,
      attachments,
    });

    if (!profile) return res.status(401).json({ error: "Unauthorized." });
    if (!conversationId)
      return res.status(400).json({ error: "Conversation ID is missing." });

    if (!content)
      return res
        .status(400)
        .json({ error: "Content is required." });

    // Find the conversation and check if the user is a member
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId as string,
        members: {
          some: {
            member: {
              profileId: profile.id,
            },
            leftAt: null, // Only active members
          },
        },
      },
      include: {
        members: {
          where: {
            leftAt: null, // Only active members
          },
          include: {
            member: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!conversation)
      return res.status(404).json({ message: "Conversation not found." });

    // Find the current user's member record
    const currentMember = conversation.members.find(
      (member) => member.member.profileId === profile.id
    );

    if (!currentMember)
      return res.status(404).json({ message: "Member not found." });

    const message = await db.directMessage.create({
      data: {
        content: content || "", // Allow empty content if there are attachments
        conversationId: conversationId as string,
        memberId: currentMember.member.id,
        attachments: {
          create:
            attachments?.map(
              (attachment: { url: string; name: string; utId: string }) => ({
                url: attachment.url,
                name: attachment.name,
                utId: attachment.utId, // Assuming utId is part of the attachment
              })
            ) || [],
        },
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
        attachments: true,
      },
    });

    const channelKey = `chat:${conversationId}:messages`;

    res?.socket?.server?.io?.emit(channelKey, message);

    // Create notifications for other members in the conversation
    const otherMembers = conversation.members.filter(
      (conversationMember) => conversationMember.member.profileId !== profile.id
    );

    console.log(`Creating notifications for ${otherMembers.length} other members`);

    for (const conversationMember of otherMembers) {
      try {
        console.log(`Creating notification for user: ${conversationMember.member.profileId}`);
        
        const notification = await db.notification.create({
          data: {
            type: "MESSAGE",
            title: `${profile.name}`,
            content: content.length > 100 ? content.substring(0, 100) + "..." : content,
            profileId: conversationMember.member.profileId,
            triggeredById: profile.id,
            conversationId: conversationId as string,
            read: false,
          },
          include: {
            triggeredBy: true,
            conversation: true,
          },
        });

        console.log(`Notification created:`, notification);
        console.log(`Emitting to room: user:${conversationMember.member.profileId}`);

        // Emit notification to the user's specific room
        res?.socket?.server?.io?.to(`user:${conversationMember.member.profileId}`).emit("notification:new", notification);
      } catch (notificationError) {
        console.error(`Failed to create notification for user ${conversationMember.member.profileId}:`, notificationError);
      }
    }

    // Trigger conversation sidebar refresh
    res?.socket?.server?.io?.emit("conversations:refresh", {
      timestamp: new Date(),
      conversationId: conversationId,
      lastMessage: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        member: message.member,
      },
    });

    return res.status(200).json(message);
  } catch (error: unknown) {
    console.error("[DIRECT_MESSAGES_POST]: ", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
}
