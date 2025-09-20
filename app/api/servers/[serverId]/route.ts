import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is a member of this server
    const member = await db.member.findFirst({
      serverId: params.serverId,
      profileId: profile.id,
    });

    if (!member) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get the server details
    const server = await db.server.findFirst({
      id: params.serverId,
    });

    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }

    // Get channels for this server
    const channels = await db.channel.findMany({
      serverId: params.serverId,
    });

    // Get members for this server
    const members = await db.member.findMany({
      serverId: params.serverId,
    });

    // Get profiles for the members
    const memberProfiles = await Promise.all(
      members.map(async (memberItem: any) => {
        const memberProfile = await db.profile.findFirst({
          id: memberItem.profileId,
        });
        return {
          ...memberItem,
          profile: memberProfile,
        };
      })
    );

    const serverData = {
      ...server,
      channels: channels.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      members: memberProfiles.filter((memberItem: any) => memberItem.profile !== null),
      currentMember: member
    };

    return NextResponse.json(serverData);
  } catch (error) {
    console.error("[SERVER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { serverId: string } },
) {
  try {
    const profile = await currentProfile();
    const { name, imageUrl } = await req.json();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    const server = await db.server.update({
      where: {
        id: params.serverId,
        profileId: profile.id,
      },
      data: {
        name,
        imageUrl,
      },
    });

    return NextResponse.json(server);
  } catch (error: unknown) {
    console.error("[SERVER_ID_PATCH]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { serverId: string } },
) {
  try {
    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    const server = await db.server.delete({
      where: {
        id: params.serverId,
        profileId: profile.id,
      },
    });

    return NextResponse.json(server);
  } catch (error: unknown) {
    console.error("[SERVER_ID_DELETE]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
