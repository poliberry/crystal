import { type NextRequest, NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { secureRandomString } from "@/lib/invite-code";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { serverId: string } },
) {
  try {
    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    if (!params.serverId)
      return new NextResponse("Server ID is missing.", { status: 400 });

    const server = await db.server.update({
      where: {
        id: params.serverId,
        profileId: profile.id,
      },
      data: {
        inviteCode: secureRandomString(),
      },
    });

    return NextResponse.json(server);
  } catch (error: unknown) {
    console.error("[SERVER_ID]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
