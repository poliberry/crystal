import { NextResponse, type NextRequest } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { CategoryQueries } from "@/lib/scylla-queries";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const profile = await currentProfile();
    const { direction } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.categoryId) {
      return new NextResponse("Category ID missing", { status: 400 });
    }

    // Check if this is a fallback category (not a real database category)
    if (params.categoryId.startsWith('fallback-')) {
      return new NextResponse("Cannot move fallback categories", { status: 400 });
    }

    if (!direction || !["up", "down"].includes(direction)) {
      return new NextResponse("Invalid direction", { status: 400 });
    }

    // Get the current category
    const currentCategory = await CategoryQueries.findById(params.categoryId);

    if (!currentCategory) {
      return new NextResponse("Category not found", { status: 404 });
    }

    // TODO: Add permission check when member system is integrated with ScyllaDB
    // For now, assuming user has permission since they have access to the server

    // Get all categories in the server
    const categoriesInServer = await CategoryQueries.findByServerId(currentCategory.server_id);

    // Sort by position to get the correct order
    categoriesInServer.sort((a, b) => a.position - b.position);

    // Find current category's index in the sorted list
    const currentIndex = categoriesInServer.findIndex(cat => 
      cat.id.toString() === params.categoryId
    );
    
    if (currentIndex === -1) {
      return new NextResponse("Category not found in server", { status: 404 });
    }

    let newIndex: number;
    if (direction === "up") {
      if (currentIndex === 0) {
        return new NextResponse("Cannot move up - already at top", { status: 400 });
      }
      newIndex = currentIndex - 1;
    } else {
      if (currentIndex === categoriesInServer.length - 1) {
        return new NextResponse("Cannot move down - already at bottom", { status: 400 });
      }
      newIndex = currentIndex + 1;
    }

    // Swap positions
    const categoryToSwapWith = categoriesInServer[newIndex];
    const currentPosition = currentCategory.position;
    const newPosition = categoryToSwapWith.position;

    // Update both categories' positions
    await Promise.all([
      CategoryQueries.update(params.categoryId, { position: newPosition }),
      CategoryQueries.update(categoryToSwapWith.id, { position: currentPosition })
    ]);

    // Trigger Pusher event for live updates
    try {
      await pusherServer.trigger(`server-${currentCategory.server_id}`, "categories:moved", {
        categoryId: params.categoryId,
        direction,
        movedCategoryId: params.categoryId,
        swappedCategoryId: categoryToSwapWith.id,
        serverId: currentCategory.server_id
      });
    } catch (pusherError) {
      console.error("[PUSHER_ERROR] Failed to trigger category move event:", pusherError);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[CATEGORY_MOVE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
