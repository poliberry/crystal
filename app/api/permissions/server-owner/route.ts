import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { memberId, serverId } = await req.json();

    if (!memberId) {
      return new NextResponse("Missing memberId", { status: 400 });
    }

    // Get the member
    const member = await db.member.findFirst({
      where: { id: memberId }
    });

    if (!member) {
      return NextResponse.json({ isOwner: false, isAdmin: false });
    }

    const targetServerId = serverId || member.serverId;

    // Get the server
    const server = await db.server.findFirst({
      where: { id: targetServerId }
    });

    if (!server) {
      return NextResponse.json({ isOwner: false, isAdmin: false });
    }

    // Check if member's profile created the server (server owner)
    const isOwner = member.profileId === server.profileId;
    
    // Check if member has admin role
    const isAdmin = member.role === 'ADMIN';

    return NextResponse.json({ 
      isOwner, 
      isAdmin: isAdmin || isOwner // Server owner is also admin
    });

  } catch (error) {
    console.log("[SERVER_OWNER_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
