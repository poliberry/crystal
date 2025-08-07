import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { presenceStatus } = await req.json();

    // Update the user's presence status
    const updatedProfile = await db.profile.update({
      where: {
        id: profile.id,
      },
      data: {
        presenceStatus: presenceStatus || null, // Allow clearing the status
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.log("[USER_STATUS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
