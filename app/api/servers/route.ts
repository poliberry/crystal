import { MemberRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { v4 as uuid } from "uuid";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, imageUrl } = await req.json();

    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    const server = await db.server.create({
      data: {
        profileId: profile.id,
        name,
        imageUrl,
        inviteCode: uuid(),
        members: {
          create: [{ profileId: profile.id, role: MemberRole.ADMIN }],
        },
      },
    });

    const completeServer = await db.server.update({
      where: { id: server.id },
      data: {
        categories: {
          create: {
            name: "Text Channels",
            channels: {
              create: [
                {
                  name: "general",
                  type: "TEXT",
                  position: 1,
                  profileId: profile.id,
                  serverId: server.id,
                },
              ],
              
            },
          },
        },
      }
    });

    return NextResponse.json(completeServer);
  } catch (error: unknown) {
    console.error("[SERVERS_POST]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
