import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiRequest, NextApiResponse } from "next";
import { UserStatus } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed." });
    }

    try {
        const profile = await currentProfilePages(req);

        if (!profile) return res.status(401).json({ error: "Unauthorized." });

        // Parse status from body, supporting both fetch and sendBeacon payloads
        let status: string | undefined;
        if (req.headers["content-type"]?.includes("application/json")) {
            status = req.body.status;
        } else if (typeof req.body === "string") {
            try {
                const parsed = JSON.parse(req.body);
                status = parsed.status;
            } catch {
                status = undefined;
            }
        }

        // Validate status
        if (!status || !Object.values(UserStatus).includes(status as UserStatus)) {
            return res.status(400).json({ error: "Invalid status value." });
        }

        // Get current profile state for comparison
        const currentProfile = await db.profile.findUnique({
            where: { id: profile.id },
            select: { status: true, presenceStatus: true }
        });

        if (!currentProfile) {
            return res.status(404).json({ error: "Profile not found" });
        }

        await db.profile.update({
            where: { id: profile.id },
            data: { status: status as UserStatus, prevStatus: profile.status as UserStatus },
        });

        // Only emit if status actually changed
        if (status !== currentProfile.status) {
            try {
                // Emit the updated user status to all connected clients with enhanced data
                const eventData = {
                    userId: profile.userId,
                    status: status as UserStatus,
                    presenceStatus: currentProfile.presenceStatus,
                    prevStatus: profile.status as UserStatus,
                };

                // Emit multiple events for compatibility
                await pusherServer.trigger("presence", "user:status:update", eventData);
                await pusherServer.trigger("presence", "presence-status-update", {
                    profileId: profile.id,
                    ...eventData,
                });
                await pusherServer.trigger("presence", "members:poll", { timestamp: Date.now() });

                console.log(`[PUSHER_STATUS_UPDATE] User ${profile.userId} status changed from ${profile.status} to ${status}`);
            } catch (pusherError) {
                console.error("[PUSHER_ERROR] Failed to emit status update:", pusherError);
                // Don't fail the request if Pusher fails
            }
        }

        return res.status(200).json({ message: "User status updated successfully." });
    } catch (error: unknown) {
        console.error("[USER_STATUS_POST]: ", error);
        return res.status(500).json({ error: "Internal Server Error." });
    }
}