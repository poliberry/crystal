import { MemberRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { CategoryQueries, ServerQueries, MemberQueries } from "@/lib/scylla-queries";
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

    // Check if user has permission to create categories
    const member = await MemberQueries.findByServerAndProfile(serverId, profile.id);
    if (!member || (member.role !== 'ADMIN' && member.role !== 'MODERATOR')) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Get current categories to determine position
    const existingCategories = await CategoryQueries.findByServerId(serverId);
    const maxPosition = existingCategories.length > 0 
      ? Math.max(...existingCategories.map(cat => cat.position || 0))
      : 0;

    // Create the new category
    const newCategory = await CategoryQueries.create({
      name,
      server_id: serverId as any, // UUID conversion handled by ScyllaDB
      position: maxPosition + 1
    });

    // Trigger Pusher event for live updates
    try {
      await pusherServer.trigger(`server-${serverId}`, "categories:created", {
        category: newCategory,
        serverId
      });
    } catch (pusherError) {
      console.error("[PUSHER_ERROR] Failed to trigger category creation event:", pusherError);
    }

    return NextResponse.json(newCategory);
  } catch (error: unknown) {
    console.error("[CHANNELS_POST]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
