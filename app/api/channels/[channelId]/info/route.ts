import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const channel = await db.channel.findUnique({
      where: {
        id: params.channelId,
      },
      include: {
        server: {
          include: {
            members: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const member = channel.server.members.find(
      (member) => member.profileId === profile.id
    );

    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // Get connected users from LiveKit room
    try {
      const roomResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/rooms?room=${channel.id}`);
      const connectedUsers = await roomResponse.json();

      // For stage channels, we'll categorize users
      let speakers = [];
      let audience = [];

      if (channel.type === "STAGE") {
        // In a real implementation, you would check LiveKit participant permissions
        // For now, we'll assume the first few users are speakers
        speakers = connectedUsers.slice(0, Math.min(3, connectedUsers.length));
        audience = connectedUsers.slice(3);
      }

      return NextResponse.json({
        channel: {
          id: channel.id,
          name: channel.name,
          type: channel.type,
        },
        server: {
          id: channel.server.id,
          name: channel.server.name,
        },
        connectedUsers: connectedUsers.length,
        speakers: speakers.length,
        audience: audience.length,
        isConnected: false, // This endpoint is for disconnected users
      });
    } catch (error) {
      // If we can't get room info, return basic channel info
      return NextResponse.json({
        channel: {
          id: channel.id,
          name: channel.name,
          type: channel.type,
        },
        server: {
          id: channel.server.id,
          name: channel.server.name,
        },
        connectedUsers: 0,
        speakers: 0,
        audience: 0,
        isConnected: false,
      });
    }
  } catch (error) {
    console.log("[CHANNEL_INFO]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
