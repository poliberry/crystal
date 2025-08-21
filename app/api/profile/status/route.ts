import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserStatus } from "@prisma/client";

export async function PATCH(req: NextRequest) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { status, presenceStatus } = await req.json();

    // Validate status
    if (status && !Object.values(UserStatus).includes(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    // Update profile status
    const updatedProfile = await db.profile.update({
      where: {
        id: profile.id
      },
      data: {
        ...(status && { 
          prevStatus: profile.status !== UserStatus.OFFLINE ? profile.status : profile.prevStatus,
          status 
        }),
        ...(presenceStatus !== undefined && { presenceStatus })
      }
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.log("[PROFILE_STATUS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json({
      status: profile.status,
      prevStatus: profile.prevStatus,
      presenceStatus: profile.presenceStatus
    });
  } catch (error) {
    console.log("[PROFILE_STATUS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
