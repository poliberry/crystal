import { type NextApiRequest } from "next";

import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { type NextApiResponseServerIo } from "@/types";
import { pusherServer } from "@/lib/pusher";

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

    console.log("Looking for conversation with ID:", conversationId, "for profile:", profile.id);

    // Find the conversation and check if the user is a member
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId as string,
        members: {
          some: {
            profileId: profile.id,
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
            profile: true,
            member: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    console.log("Found conversation:", conversation ? "Yes" : "No");
    if (conversation) {
      console.log("Conversation members:", conversation.members.length);
      console.log("Member profile IDs:", conversation.members.map(m => m.profileId));
    }

    if (!conversation)
      return res.status(404).json({ message: "Conversation not found." });

    // Find the current user's member record
    const currentMember = conversation.members.find(
      (member) => member.profileId === profile.id
    );

    if (!currentMember)
      return res.status(404).json({ message: "Member not found." });

    const message = await db.directMessage.create({
      data: {
        content: content || "", // Allow empty content if there are attachments
        conversationId: conversationId as string,
        memberId: currentMember.memberId, // This might be null for profile-based conversations
        profileId: profile.id,
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
        profile: true, // Include the profile directly for profile-based conversations
        attachments: true,
      },
    });

    const channelKey = `chat:${conversationId}:messages`;

    // Use Pusher to emit the message
    try {
      await pusherServer.trigger(channelKey, "message", message);
    } catch (pusherError) {
      console.error("Failed to emit message via Pusher:", pusherError);
    }

    // Create notifications for other members in the conversation
    const otherMembers = conversation.members.filter(
      (conversationMember) => conversationMember.profileId !== profile.id
    );

    console.log(`Creating notifications for ${otherMembers.length} other members`);

    for (const conversationMember of otherMembers) {
      try {
        console.log(`Creating notification for user: ${conversationMember.profileId}`);
        
        const notification = await db.notification.create({
          data: {
            type: "MESSAGE",
            title: `${profile.name}`,
            content: content.length > 100 ? content.substring(0, 100) + "..." : content,
            profileId: conversationMember.profileId,
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
        console.log(`Emitting to user: ${conversationMember.profileId}`);

        // Use Pusher for notifications
        try {
          await pusherServer.trigger(`private-user-${conversationMember.profileId}`, "notification:new", notification);
        } catch (pusherError) {
          console.error("Failed to emit notification via Pusher:", pusherError);
        }
      } catch (notificationError) {
        console.error(`Failed to create notification for user ${conversationMember.profileId}:`, notificationError);
      }
    }

    // Use Pusher for conversation refresh
    try {
      await pusherServer.trigger("conversations", "refresh", {
        timestamp: new Date(),
        conversationId: conversationId,
        lastMessage: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          member: message.member,
        },
      });
    } catch (pusherError) {
      console.error("Failed to emit conversation refresh via Pusher:", pusherError);
    }

    return res.status(200).json(message);
  } catch (error: unknown) {
    console.error("[DIRECT_MESSAGES_POST]: ", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
}
