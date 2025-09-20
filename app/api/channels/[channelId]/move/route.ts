import { NextResponse, type NextRequest } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { ChannelQueries } from "@/lib/scylla-queries";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();
    const { direction, categoryId } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.channelId) {
      return new NextResponse("Channel ID missing", { status: 400 });
    }

    if (!direction || !["up", "down"].includes(direction)) {
      return new NextResponse("Invalid direction", { status: 400 });
    }

    // Get the current channel
    const currentChannel = await ChannelQueries.findById(params.channelId);

    if (!currentChannel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    // Check if this is trying to move within a fallback category
    if (categoryId && categoryId.startsWith('fallback-')) {
      return new NextResponse("Cannot move channels within fallback categories", { status: 400 });
    }

    // TODO: Add permission check when member system is integrated with ScyllaDB
    // For now, assuming user has permission since they have access to the server

    // Get all channels in the same category (or uncategorized if categoryId is null)
    const allChannelsInServer = await ChannelQueries.findByServerId(currentChannel.server_id);
    
    // Filter channels by category and type
    const channelsInCategory = allChannelsInServer.filter(ch => {
      const channelCategoryId = ch.category_id ? ch.category_id.toString() : null;
      const targetCategoryId = categoryId || null;
      
      return channelCategoryId === targetCategoryId && ch.type === currentChannel.type;
    });

    // Sort by position to get the correct order
    channelsInCategory.sort((a, b) => a.position - b.position);

    // Find current channel's index in the sorted list
    const currentIndex = channelsInCategory.findIndex(ch => 
      ch.id.toString() === params.channelId
    );
    
    if (currentIndex === -1) {
      return new NextResponse("Channel not found in category", { status: 404 });
    }

    let newIndex: number;
    if (direction === "up") {
      if (currentIndex === 0) {
        return new NextResponse("Cannot move up - already at top", { status: 400 });
      }
      newIndex = currentIndex - 1;
    } else {
      if (currentIndex === channelsInCategory.length - 1) {
        return new NextResponse("Cannot move down - already at bottom", { status: 400 });
      }
      newIndex = currentIndex + 1;
    }

    // Swap positions
    const channelToSwapWith = channelsInCategory[newIndex];
    const currentPosition = currentChannel.position;
    const newPosition = channelToSwapWith.position;

    // Update both channels' positions
    await Promise.all([
      ChannelQueries.update(params.channelId, { position: newPosition }),
      ChannelQueries.update(channelToSwapWith.id, { position: currentPosition })
    ]);

    // Trigger Pusher event for live updates
    try {
      await pusherServer.trigger(`server-${currentChannel.server_id}`, "channels:moved", {
        channelId: params.channelId,
        direction,
        categoryId,
        movedChannelId: params.channelId,
        swappedChannelId: channelToSwapWith.id,
        serverId: currentChannel.server_id
      });
    } catch (pusherError) {
      console.error("[PUSHER_ERROR] Failed to trigger channel move event:", pusherError);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[CHANNEL_MOVE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
