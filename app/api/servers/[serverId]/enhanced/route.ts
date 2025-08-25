import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { serverId } = params;

    // Check if user is member of the server
    const member = await db.member.findFirst({
      where: {
        profileId: profile.id,
        serverId: serverId
      }
    });

    if (!member) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Get enhanced server data with roles and member roles
    const server = await db.server.findUnique({
      where: {
        id: serverId,
      },
      include: {
        channels: {
          orderBy: {
            position: "asc",
          },
        },
        members: {
          include: {
            profile: true,
            memberRoles: {
              include: {
                role: true
              },
              orderBy: {
                role: {
                  position: 'desc'
                }
              }
            }
          },
          orderBy: {
            role: "asc",
          },
        },
        roles: {
          include: {
            permissions: true,
            memberRoles: {
              include: {
                member: {
                  select: {
                    id: true,
                    profileId: true
                  }
                }
              }
            }
          },
          orderBy: {
            position: 'desc'
          }
        },
        categories: {
          include: {
            channels: {
              orderBy: {
                position: "asc",
              },
            },
          },
        },
      },
    });

    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }

    // Transform data to include flattened roles on members
    const enhancedMembers = server.members.map(member => ({
      ...member,
      roles: member.memberRoles.map(mr => mr.role)
    }));

    // Transform roles to include member count
    const enhancedRoles = server.roles.map(role => ({
      ...role,
      memberCount: role.memberRoles.length
    }));

    const enhancedServer = {
      ...server,
      members: enhancedMembers,
      roles: enhancedRoles
    };

    return NextResponse.json(enhancedServer);
  } catch (error) {
    console.error("[ENHANCED_SERVER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
