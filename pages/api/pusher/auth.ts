import { NextApiRequest, NextApiResponse } from "next";
import { pusherServer } from "@/lib/pusher";
import { currentProfilePages } from "@/lib/current-profile-pages";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    
    if (!profile) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { socket_id, channel_name } = req.body;

    console.log("[PUSHER_AUTH] Received auth request:", { socket_id, channel_name, body: req.body });

    if (!socket_id) {
      console.error("[PUSHER_AUTH] Missing socket_id in request body:", req.body);
      return res.status(400).json({ message: "Missing socket_id" });
    }

    if (!channel_name) {
      console.error("[PUSHER_AUTH] Missing channel_name");
      return res.status(400).json({ message: "Missing channel_name" });
    }
    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, {
      user_id: profile.userId,
      user_info: {
        name: profile.name,
        imageUrl: profile.imageUrl,
      },
    });

    return res.status(200).json(authResponse);
  } catch (error) {
    console.error("[PUSHER_AUTH_ERROR]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
