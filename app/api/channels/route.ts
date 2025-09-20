import { MemberRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { ChannelQueries, MemberQueries } from "@/lib/scylla-queries";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    const { name, type } = await req.json();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });
    if (!serverId)
      return new NextResponse("Server ID is missing.", { status: 400 });
    if (name === "general")
      return new NextResponse('Name cannot be "general".', { status: 400 });

    // Check if user has permission to create channels
    const member = await MemberQueries.findByServerAndProfile(serverId, profile.id);
    if (!member || (member.role !== 'ADMIN' && member.role !== 'MODERATOR')) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Get current channels to determine position
    const categoryId = searchParams.get("categoryId");
    const existingChannels = await ChannelQueries.findByServerId(serverId);
    
    const maxPosition = existingChannels.length > 0 
      ? Math.max(...existingChannels.map((ch: any) => ch.position || 0))
      : 0;

    // Create the new channel
    const newChannel = await ChannelQueries.create({
      name,
      type: type || 'TEXT',
      server_id: serverId as any,
      category_id: categoryId ? (categoryId as any) : null,
      profile_id: profile.id as any,
      position: maxPosition + 1
    });

    // Trigger Pusher event for live updates
    try {
      await pusherServer.trigger(`server-${serverId}`, "channels:created", {
        channel: newChannel,
        serverId,
        categoryId: categoryId || null
      });
    } catch (pusherError) {
      console.error("[PUSHER_ERROR] Failed to trigger channel creation event:", pusherError);
    }

    return NextResponse.json(newChannel);
  } catch (error: unknown) {
    console.error("[CHANNELS_POST]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
