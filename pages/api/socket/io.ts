import type { Server as NetServer } from "http";
import type { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { db } from "@/lib/db";
import { ConversationType } from "@prisma/client";

import type { NextApiResponseServerIo } from "@/types";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIo) => {
  if (!res.socket.server.io) {
    const path = "/api/socket/io";
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path,
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      // Handle user joining their notification room
      socket.on("user:join", (profileId: string) => {
        if (profileId) {
          socket.join(`user:${profileId}`);
          console.log(`User ${profileId} joined their notification room`);
        }
      });

      // Handle user joining their page context room
      socket.on("user:join:page-context", (profileId: string) => {
        if (profileId) {
          socket.join(`page-context:${profileId}`);
          console.log(`User ${profileId} joined their page context room`);
        }
      });

      // Handle page context updates
      socket.on("page:context:update", (data: any) => {
        if (data.profileId && data.pageInfo) {
          // Emit only to this user's page context room
          io.to(`page-context:${data.profileId}`).emit("page:context:update", data.pageInfo);
        }
      });

      // Handle page context updates
      socket.on("page:context:set", (pageInfo) => {
        // Broadcast the page context back to the specific socket
        socket.emit("page:context:update", pageInfo);
      });

      // Handle call start events
      socket.on("call:start", async (data) => {
        try {
          console.log("[CALL_START_SOCKET]", data);
          
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
            const otherMember = conversation.members.find(m => m.member.profileId !== callerId);
            conversationName = otherMember?.member.profile.globalName || otherMember?.member.profile.name || "Unknown User";
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
            participantIds: conversation.members.map(m => m.member.profile.id)
          };

          // Broadcast to all clients
          io.emit("call:incoming", callData);
          
        } catch (error) {
          console.error("[CALL_START_SOCKET_ERROR]", error);
        }
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
