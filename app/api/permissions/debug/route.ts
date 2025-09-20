import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { memberId } = await req.json();

    if (!memberId) {
      return new NextResponse("Missing memberId", { status: 400 });
    }

    console.log("[DEBUG] Looking for member with ID:", memberId);

    // Get member
    const member = await db.member.findFirst({
      where: { id: memberId }
    });

    console.log("[DEBUG] Found member:", member);

    if (!member) {
      return NextResponse.json({ 
        error: "Member not found",
        memberId,
        found: false
      });
    }

    // Get server
    const server = await db.server.findFirst({
      where: { id: member.serverId }
    });

    console.log("[DEBUG] Found server:", server);

    if (!server) {
      return NextResponse.json({ 
        error: "Server not found",
        member,
        serverId: member.serverId,
        found: false
      });
    }

    // Check ownership
    const isOwner = member.profileId === server.profileId;
    
    return NextResponse.json({
      member: {
        id: member.id,
        profileId: member.profileId,
        serverId: member.serverId,
        role: member.role
      },
      server: {
        id: server.id,
        profileId: server.profileId,
        name: server.name
      },
      ownership: {
        memberProfileId: member.profileId,
        serverProfileId: server.profileId,
        isOwner,
        isEqual: member.profileId === server.profileId
      },
      currentProfile: {
        id: profile.id
      }
    });

  } catch (error) {
    console.log("[DEBUG] Error:", error);
    return NextResponse.json({ error: String(error) });
  }
}
