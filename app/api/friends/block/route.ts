import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/friends/block - Block a user
export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { targetUserId, reason } = await req.json();

    if (!targetUserId) {
      return new NextResponse("Target user ID required", { status: 400 });
    }

    if (targetUserId === profile.id) {
      return new NextResponse("Cannot block yourself", { status: 400 });
    }

    // Check if target user exists
    const targetUser = await db.profile.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Check if already blocked
    const existingBlock = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: profile.id,
          blockedId: targetUserId
        }
      }
    });

    if (existingBlock) {
      return new NextResponse("User already blocked", { status: 400 });
    }

    // Remove any existing friendship
    await db.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: profile.id, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: profile.id }
        ]
      }
    });

    // Create block
    const block = await db.block.create({
      data: {
        blockerId: profile.id,
        blockedId: targetUserId,
        reason: reason || undefined
      },
      include: {
        blocker: true,
        blocked: true
      }
    });

    return NextResponse.json(block);
  } catch (error) {
    console.error("[BLOCK_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
