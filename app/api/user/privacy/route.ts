import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// PATCH /api/user/privacy - Update user privacy settings
export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { allowNonFriendDMs, friendRequestPrivacy } = await req.json();

    // Validate friendRequestPrivacy
    if (friendRequestPrivacy && !["everyone", "friends-of-friends", "none"].includes(friendRequestPrivacy)) {
      return new NextResponse("Invalid friend request privacy setting", { status: 400 });
    }

    const updatedProfile = await db.profile.update({
      where: { id: profile.id },
      data: {
        ...(typeof allowNonFriendDMs === "boolean" && { allowNonFriendDMs }),
        ...(friendRequestPrivacy && { friendRequestPrivacy })
      }
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("[USER_PRIVACY_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
