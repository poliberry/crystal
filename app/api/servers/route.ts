import { NextResponse, type NextRequest } from "next/server";
import { v4 as uuid } from "uuid";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole, ChannelType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { name, imageUrl } = await req.json();

    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    // Create the server
    const server = await db.server.create({
      data: {
        profileId: profile.id,
        name,
        imageUrl: imageUrl,
        inviteCode: uuid(),
      },
    });

    // Create the admin member record
    const member = await db.member.create({
      data: {
        serverId: server.id,
        profileId: profile.id,
        role: MemberRole.ADMIN,
      },
    });

    // Create default channels
    const textChannel = await db.channel.create({
      data: {
        name: "general",
        type: ChannelType.TEXT,
        serverId: server.id,
        profileId: profile.id,
        position: 0,
      },
    });

    const voiceChannel = await db.channel.create({
      data: {
        name: "general",
        type: ChannelType.AUDIO,
        serverId: server.id,
        profileId: profile.id,
        position: 1,
      },
    });

    // Return the server with member and channels
    return NextResponse.json({
      ...server,
      members: [member],
      channels: [textChannel, voiceChannel]
    });
  } catch (error: unknown) {
    console.error("[SERVERS_POST]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
