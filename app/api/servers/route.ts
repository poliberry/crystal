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

    // Note: For simplicity, we'll return the server here
    // In a more complete implementation, you might want to:
    // 1. Create default categories and channels in separate repositories
    // 2. Return a complete server object with channels included
    
    return NextResponse.json({
      ...server,
      members: [member]
    });
  } catch (error: unknown) {
    console.error("[SERVERS_POST]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
