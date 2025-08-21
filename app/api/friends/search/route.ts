import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/friends/search - Search for users to add as friends
export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Get current user's friendships and blocks
    const [friendships, blocks] = await Promise.all([
      db.friendship.findMany({
        where: {
          OR: [
            { requesterId: profile.id },
            { receiverId: profile.id }
          ]
        },
        select: {
          requesterId: true,
          receiverId: true,
          status: true
        }
      }),
      db.block.findMany({
        where: {
          OR: [
            { blockerId: profile.id },
            { blockedId: profile.id }
          ]
        },
        select: {
          blockerId: true,
          blockedId: true
        }
      })
    ]);

    // Get IDs of users we shouldn't show
    const excludeIds = new Set([profile.id]);
    
    friendships.forEach(f => {
      excludeIds.add(f.requesterId);
      excludeIds.add(f.receiverId);
    });
    
    blocks.forEach(b => {
      excludeIds.add(b.blockerId);
      excludeIds.add(b.blockedId);
    });

    // Search for users
    const users = await db.profile.findMany({
      where: {
        AND: [
          {
            id: {
              notIn: Array.from(excludeIds)
            }
          },
          {
            OR: [
              {
                name: {
                  contains: query,
                  mode: "insensitive"
                }
              },
              {
                globalName: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        globalName: true,
        imageUrl: true,
        status: true
      },
      take: 10
    });

    // Filter out users who don't accept friend requests
    const filteredUsers = users.filter((user: any) => {
      return user.friendRequestPrivacy !== "none";
    });

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error("[FRIENDS_SEARCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
