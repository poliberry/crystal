import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// DELETE /api/friends/block/[blockId] - Unblock a user
export async function DELETE(
  req: Request,
  { params }: { params: { blockId: string } }
) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { blockId } = params;

    // Find the block
    const block = await db.block.findUnique({
      where: { id: blockId }
    });

    if (!block) {
      return new NextResponse("Block not found", { status: 404 });
    }

    // Check if user owns this block
    if (block.blockerId !== profile.id) {
      return new NextResponse("Not authorized", { status: 403 });
    }

    // Delete the block
    await db.block.delete({
      where: { id: blockId }
    });

    return NextResponse.json({ message: "User unblocked" });
  } catch (error) {
    console.error("[BLOCK_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
