import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/friends - Get user's friends and friend requests
export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all"; // "all", "pending", "sent", "friends", "blocked"

    let data: any = {};

    if (type === "all" || type === "friends") {
      // Get accepted friendships (both directions)
      const friends = await db.friendship.findMany({
        where: {
          OR: [
            { requesterId: profile.id, status: "ACCEPTED" },
            { receiverId: profile.id, status: "ACCEPTED" }
          ]
        },
        include: {
          requester: true,
          receiver: true
        }
      });

      data = {
        ...data,
        friends: friends.map((friendship: any) => {
          const friend = friendship.requesterId === profile.id 
            ? friendship.receiver 
            : friendship.requester;
          return {
            ...friend,
            friendshipId: friendship.id,
            since: friendship.createdAt
          };
        })
      };
    }

    if (type === "all" || type === "pending") {
      // Get pending requests received
      const pendingRequests = await db.friendship.findMany({
        where: {
          receiverId: profile.id,
          status: "PENDING"
        },
        include: {
          requester: true
        }
      });

      data = {
        ...data,
        pendingRequests: pendingRequests.map((req: any) => ({
          ...req.requester,
          friendshipId: req.id,
          requestedAt: req.createdAt
        }))
      };
    }

    if (type === "all" || type === "sent") {
      // Get sent requests
      const sentRequests = await db.friendship.findMany({
        where: {
          requesterId: profile.id,
          status: "PENDING"
        },
        include: {
          receiver: true
        }
      });

      data = {
        ...data,
        sentRequests: sentRequests.map((req: any) => ({
          ...req.receiver,
          friendshipId: req.id,
          requestedAt: req.createdAt
        }))
      };
    }

    if (type === "all" || type === "blocked") {
      // Get blocked users
      const blockedUsers = await db.block.findMany({
        where: {
          blockerId: profile.id
        },
        include: {
          blocked: true
        }
      });

      data = {
        ...data,
        blockedUsers: blockedUsers.map((block: any) => ({
          ...block.blocked,
          blockId: block.id,
          blockedAt: block.createdAt,
          reason: block.reason
        }))
      };
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[FRIENDS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST /api/friends - Send friend request
export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return new NextResponse("Target user ID required", { status: 400 });
    }

    if (targetUserId === profile.id) {
      return new NextResponse("Cannot send friend request to yourself", { status: 400 });
    }

    // Check if target user exists
    const targetUser = await db.profile.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Check if user is blocked
    const isBlocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: profile.id, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: profile.id }
        ]
      }
    });

    if (isBlocked) {
      return new NextResponse("Cannot send friend request to blocked user", { status: 403 });
    }

    // Check privacy settings
    if ((targetUser as any).friendRequestPrivacy === "none") {
      return new NextResponse("User is not accepting friend requests", { status: 403 });
    }

    // Check if friendship already exists
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: profile.id, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: profile.id }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === "ACCEPTED") {
        return new NextResponse("Already friends", { status: 400 });
      }
      if (existingFriendship.status === "PENDING") {
        return new NextResponse("Friend request already sent", { status: 400 });
      }
    }

    // Create friend request
    const friendship = await db.friendship.create({
      data: {
        requesterId: profile.id,
        receiverId: targetUserId,
        status: "PENDING"
      },
      include: {
        requester: true,
        receiver: true
      }
    });

    // Create notification for target user
    await db.notification.create({
      data: {
        type: "FRIEND_REQUEST",
        title: "New Friend Request",
        content: `${profile.globalName || profile.name} sent you a friend request`,
        profileId: targetUserId,
        triggeredById: profile.id
      }
    });

    return NextResponse.json(friendship);
  } catch (error) {
    console.error("[FRIENDS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
