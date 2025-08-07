import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { memberId } = params;

    // Get the current member to find which servers they're in
    const currentMember = await db.member.findUnique({
      where: {
        id: memberId,
      },
      include: {
        server: true,
      },
    });

    if (!currentMember) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // Find all members from the same servers, excluding the current member
    const availableMembers = await db.member.findMany({
      where: {
        serverId: currentMember.serverId,
        NOT: {
          id: memberId,
        },
      },
      include: {
        profile: true,
      },
      orderBy: {
        profile: {
          name: "asc",
        },
      },
    });

    return NextResponse.json(availableMembers);
  } catch (error) {
    console.log("[MEMBERS_AVAILABLE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
