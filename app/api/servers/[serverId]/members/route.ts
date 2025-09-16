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

    // Check if server exists and user is a member
    const server = await db.server.findById(params.serverId);
    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }

    // Check if current user is a member of this server
    const currentMember = await db.member.findByServerAndProfile(params.serverId, profile.id);
    if (!currentMember) {
      return new NextResponse("Not a member of this server", { status: 403 });
    }

    // Get all members of the server
    const members = await db.member.findByServerId(params.serverId);
    
    // Get profiles for all members and roles
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const memberProfile = await db.profile.findById(member.profile_id);
        if (!memberProfile) return null;

        return {
          id: member.id,
          userId: member.profile_id,
          user: {
            id: memberProfile.id,
            name: memberProfile.name,
            imageUrl: memberProfile.image_url,
            status: memberProfile.status,
            presenceStatus: memberProfile.presence_status,
          },
          role: member.role,
          roles: [], // For now, simplified - can be expanded with custom roles
        };
      })
    );

    // Filter out any null results
    const validMembers = membersWithDetails.filter(member => member !== null);

    return NextResponse.json(validMembers);
  } catch (error) {
    console.error("[SERVER_MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}