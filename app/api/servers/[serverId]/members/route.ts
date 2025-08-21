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

    // Get the server with members and their role assignments
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
        members: {
          include: {
            profile: true,
            memberRoles: {
              include: {
                role: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
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

    // Transform the data to match the expected format
    const membersWithRoles = server.members.map(member => ({
      id: member.id,
      userId: member.profileId,
      user: {
        id: member.profile.id,
        name: member.profile.name,
        imageUrl: member.profile.imageUrl,
      },
      roles: member.memberRoles.map(assignment => ({
        id: assignment.role.id,
        name: assignment.role.name,
        color: assignment.role.color || "#99AAB5",
        permissions: assignment.role.permissions.map(p => p.permission),
        position: assignment.role.position,
        memberCount: 0, // Will be calculated separately if needed
      })),
    }));

    return NextResponse.json(membersWithRoles);
  } catch (error) {
    console.error("[SERVER_MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}