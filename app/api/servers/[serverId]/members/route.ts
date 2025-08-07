import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

export async function GET(
  req: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const server = await db.server.findUnique({
      where: {
        id: params.serverId,
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
      include: {
        channels: {
          orderBy: {
            createdAt: "asc",
          },
        },
        members: {
          include: {
            profile: true,
          },
          orderBy: {
            role: "asc",
          },
        },
      },
    });

    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }

    return NextResponse.json(server);
  } catch (error) {
    console.error("[SERVER_MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}