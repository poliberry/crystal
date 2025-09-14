import { NextResponse, type NextRequest } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PATCH(
  _req: NextRequest,
  {
    params,
  }: {
    params: {
      serverId: string;
    };
  },
) {
  try {
    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    if (!params.serverId)
      return new NextResponse("Server ID is missing.", { status: 400 });

    // Check if server exists and profile is not the owner
    const server = await db.server.findById(params.serverId);
    if (!server) {
      return new NextResponse("Server not found.", { status: 404 });
    }

    if (server.profile_id === profile.id) {
      return new NextResponse("Cannot leave server you own.", { status: 400 });
    }

    // Check if member exists in the server
    const member = await db.member.findByServerAndProfile(params.serverId, profile.id);
    if (!member) {
      return new NextResponse("Member not found in server.", { status: 404 });
    }

    // Remove the member from the server
    await db.member.delete(member.id);

    return NextResponse.json({ success: true, message: "Left server successfully" });
  } catch (error: unknown) {
    console.error("[SERVER_LEAVE]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
