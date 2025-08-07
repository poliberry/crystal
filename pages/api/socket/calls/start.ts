import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiResponseServerIo } from "@/types";
import { NextApiRequest } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponseServerIo,
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed." });
    }

    try {
        const data = await JSON.parse(req.body);
        const profile = await currentProfilePages(req);

        if (!profile) return res.status(401).json({ error: "Unauthorized." });

        console.log("[CALL_START_POST]", data);

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
            return res.status(404).json({ error: "Conversation not found or unauthorized." });
        }

        // Broadcast call notification to all conversation members except the caller
        const callData = {
            conversationId,
            type,
            callerId,
            callerName,
            callerAvatar,
            participantIds: conversation.members.map(m => m.member.profile.id)
        };

        res?.socket?.server?.io?.emit("call:incoming", callData);

        return res.status(200).json({ message: "Call initiated successfully." });
    } catch (error: unknown) {
        console.error("[CALL_START_POST]: ", error);
        return res.status(500).json({ error: "Internal Server Error." });
    }
}