import type { NextApiRequest } from "next";
import { pusherServer } from "@/lib/pusher";
import { db } from "@/lib/db";
import { ConversationType } from "@/lib/types";

import type { NextApiResponseServerIo } from "@/types";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Pusher-based event handler to replace Socket.IO
const pusherHandler = async (req: NextApiRequest, res: NextApiResponseServerIo) => {
  if (req.method === "POST") {
    try {
      const { event, data, profileId } = req.body;

      switch (event) {
        case "user:join":
          // User joining their notification room
          if (profileId) {
            console.log(`User ${profileId} joined their notification room via Pusher`);
            // Pusher handles room joining automatically via auth
          }
          break;

        case "user:join:page-context":
          // User joining their page context room
          if (profileId) {
            console.log(`User ${profileId} joined their page context room via Pusher`);
          }
          break;

        case "page:context:update":
          // Handle page context updates
          if (data?.profileId && data?.pageInfo) {
            await pusherServer.trigger(`page-context-${data.profileId}`, "page:context:update", data.pageInfo);
          }
          break;

        case "page:context:set":
          // Handle page context setting
          if (profileId && data?.pageInfo) {
            await pusherServer.trigger(`page-context-${profileId}`, "page:context:update", data.pageInfo);
          }
          break;

        case "call:start":
          // Handle call start events
          await handleCallStart(data);
          break;

        default:
          console.log(`Unknown Pusher event: ${event}`);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[PUSHER_HANDLER_ERROR]", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
};

// Handle call start events
async function handleCallStart(data: any) {
  try {
    console.log("[CALL_START_PUSHER]", data);

    const { conversationId, type, callerId, callerName, callerAvatar, participantIds } = data;

    // Get conversation details to verify caller is a member
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        members: {
          some: {
            member: {
              profileId: callerId
            }
          }
        }
      },
      include: {
        members: {
          include: {
            member: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      console.log("Conversation not found or unauthorized");
      return;
    }

    // Determine conversation name
    let conversationName: string;
    if (conversation.type === ConversationType.DIRECT_MESSAGE) {
      // For DMs, use the other person's name
      const otherMember = conversation.members.find(m => m.member?.profileId !== callerId);
      conversationName = otherMember?.member?.profile?.globalName ||
                        otherMember?.member?.profile?.name || "Unknown User";
    } else {
      // For group chats, use the conversation name
      conversationName = conversation.name || "Group Chat";
    }

    // Broadcast call notification to all conversation members except the caller
    const callData = {
      conversationId,
      conversationName,
      type,
      callerId,
      callerName,
      callerAvatar,
      participantIds: conversation.members
        .filter(m => m.member?.profile?.id)
        .map(m => m.member!.profile!.id)
    };

    // Broadcast to all clients via Pusher
    await pusherServer.trigger("presence-global", "call:incoming", callData);

  } catch (error) {
    console.error("[CALL_START_PUSHER_ERROR]", error);
  }
}

export default pusherHandler;
