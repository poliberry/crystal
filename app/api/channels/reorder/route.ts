import { MemberRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
) {
  try {
    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    const { position, categoryId } = await req.json();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");
    const channelId = searchParams.get("channelId");

    if (!serverId)
      return new NextResponse("Server ID is missing.", { status: 400 });

    if (!channelId)
      return new NextResponse("Channel ID is missing.", { status: 400 });

    const server = await db.server.update({
      where: {
        id: serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR],
            },
          },
        },
      },
      data: {
        channels: {
          update: {
            where: {
              id: channelId,
            },
            data: {
              position,
              categoryId,
            },
          },
        },
      },
    });

    return NextResponse.json(server);
  } catch (error: unknown) {
    console.error("[CHANNEL_ID_PATCH]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
