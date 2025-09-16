import { NextApiRequest, NextApiResponse } from "next";
import { pusherServer } from "@/lib/pusher";
import { currentProfilePages } from "@/lib/current-profile-pages";

// Configure Next.js to parse the body as text since Pusher sends form data
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

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

    console.log("[PUSHER_AUTH] Raw request body type:", typeof req.body);
    console.log("[PUSHER_AUTH] Raw request body:", req.body);

    // Pusher sends data as application/x-www-form-urlencoded
    let socket_id: string;
    let channel_name: string;

    if (typeof req.body === 'string') {
      // Parse form-encoded data manually
      const urlParams = new URLSearchParams(req.body);
      socket_id = urlParams.get('socket_id') || '';
      channel_name = urlParams.get('channel_name') || '';
    } else {
      // If already parsed as object
      socket_id = req.body.socket_id;
      channel_name = req.body.channel_name;
    }

    console.log("[PUSHER_AUTH] Extracted values:", { socket_id, channel_name });

    if (!socket_id) {
      console.error("[PUSHER_AUTH] Missing socket_id in request");
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
