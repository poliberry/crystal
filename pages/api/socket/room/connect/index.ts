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
        const body = req.body;
        const profile = await currentProfilePages(req);

        if (!profile) return res.status(401).json({ error: "Unauthorized." });

        // Emit the updated user status to all connected clients
        res?.socket?.server?.io?.emit("room:connect-user", body);

        return res.status(200).json({ message: "User status updated successfully." });
    } catch (error: unknown) {
        console.error("[USER_STATUS_POST]: ", error);
        return res.status(500).json({ error: "Internal Server Error." });
    }
}