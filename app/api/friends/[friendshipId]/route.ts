import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// PATCH /api/friends/[friendshipId] - Accept/Decline/Cancel friend request
export async function PATCH(
  req: Request,
  { params }: { params: { friendshipId: string } }
) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { action } = await req.json(); // "accept", "decline", "cancel"
    const { friendshipId } = params;

    if (!action || !["accept", "decline", "cancel"].includes(action)) {
      return new NextResponse("Invalid action", { status: 400 });
    }

    // Find the friendship
    const friendship = await db.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: true,
        receiver: true
      }
    });

    if (!friendship) {
      return new NextResponse("Friend request not found", { status: 404 });
    }

    // Check permissions
    if (action === "cancel" && friendship.requesterId !== profile.id) {
      return new NextResponse("Can only cancel your own requests", { status: 403 });
    }

    if ((action === "accept" || action === "decline") && friendship.receiverId !== profile.id) {
      return new NextResponse("Can only respond to requests sent to you", { status: 403 });
    }

    if (friendship.status !== "PENDING") {
      return new NextResponse("Request is no longer pending", { status: 400 });
    }

    let newStatus;
    if (action === "accept") {
      newStatus = "ACCEPTED";
    } else if (action === "decline") {
      newStatus = "DECLINED";
    } else {
      newStatus = "CANCELLED";
    }

    // Update friendship status
    const updatedFriendship = await db.friendship.update({
      where: { id: friendshipId },
      data: { status: newStatus as any },
      include: {
        requester: true,
        receiver: true
      }
    });

    // Create notification for the other user
    if (action === "accept") {
      await db.notification.create({
        data: {
          type: "FRIEND_REQUEST",
          title: "Friend Request Accepted",
          content: `${profile.globalName || profile.name} accepted your friend request`,
          profileId: friendship.requesterId,
          triggeredById: profile.id
        }
      });
    }

    return NextResponse.json(updatedFriendship);
  } catch (error) {
    console.error("[FRIENDS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE /api/friends/[friendshipId] - Remove friendship or delete request
export async function DELETE(
  req: Request,
  { params }: { params: { friendshipId: string } }
) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { friendshipId } = params;

    // Find the friendship
    const friendship = await db.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: true,
        receiver: true
      }
    });

    if (!friendship) {
      return new NextResponse("Friendship not found", { status: 404 });
    }

    // Check if user is part of this friendship
    if (friendship.requesterId !== profile.id && friendship.receiverId !== profile.id) {
      return new NextResponse("Not authorized", { status: 403 });
    }

    // Delete the friendship
    await db.friendship.delete({
      where: { id: friendshipId }
    });

    return NextResponse.json({ message: "Friendship removed" });
  } catch (error) {
    console.error("[FRIENDS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
