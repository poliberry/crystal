import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiResponseServerIo } from "@/types";
import { NextApiRequest } from "next";
import { UserStatus } from "@prisma/client";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponseServerIo,
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

        await db.profile.update({
            where: { id: profile.id },
            data: { status: status as UserStatus, prevStatus: profile.status as UserStatus },
        });

        // Emit the updated user status to all connected clients
        res?.socket?.server?.io?.emit("user:status:update", {
            userId: profile.userId,
            status: status as UserStatus,
        });

        return res.status(200).json({ message: "User status updated successfully." });
    } catch (error: unknown) {
        console.error("[USER_STATUS_POST]: ", error);
        return res.status(500).json({ error: "Internal Server Error." });
    }
}