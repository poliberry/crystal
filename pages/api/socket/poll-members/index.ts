import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiResponseServerIo } from "@/types";
import { NextApiRequest } from "next";
import { UserStatus } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const profile = await currentProfilePages(req);

  if (!profile) return res.status(401).json({ error: "Unauthorized." });

  res?.socket?.server?.io?.emit("members:poll", true);

  return res.status(200).json({ message: "Members polled successfully." });
}
