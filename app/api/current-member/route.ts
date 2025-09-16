import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the first server member for this profile (for testing)
    const member = await db.member.findFirst({
      where: {
        profileId: profile.id
      },
      select: {
        id: true,
        serverId: true,
        role: true
      }
    });

    if (!member) {
      return new NextResponse("No member found", { status: 404 });
    }

    return NextResponse.json({
      memberId: member.id,
      serverId: member.serverId,
      legacyRole: member.role
    });
  } catch (error) {
    console.log("[CURRENT_MEMBER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
