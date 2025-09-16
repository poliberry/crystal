import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

export async function GET(
  req: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const param = await params;
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");

    // Fetch the target user's profile
    const targetProfile = await db.profile.findUnique({
      where: {
        id: param.profileId,
      },
    });

    if (!targetProfile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    // Calculate mutual servers
    const currentUserServers = await db.member.findMany({
      where: {
        profileId: profile.id,
      },
      select: {
        serverId: true,
      },
    });

    // Format the response
    const responseData = {
      id: targetProfile.id,
      userId: targetProfile.userId,
      name: targetProfile.name,
      globalName: targetProfile.globalName,
      imageUrl: targetProfile.imageUrl,
      bannerUrl: targetProfile.bannerUrl || "",
      bio: targetProfile.bio,
      email: targetProfile.email,
      status: targetProfile.status,
      createdAt: targetProfile.createdAt,
      updatedAt: targetProfile.updatedAt,
      pronouns: targetProfile.pronouns,
      presenceStatus: targetProfile.presenceStatus || null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[USER_PROFILE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}