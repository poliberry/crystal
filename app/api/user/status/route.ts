import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json({ 
      status: profile.status,
      presenceStatus: profile.presenceStatus,
      isDND: profile.status === "DND"
    });
  } catch (error) {
    console.log("[USER_STATUS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { status, presenceStatus } = await req.json();

    // Validate status if provided
    const validStatuses = ["ONLINE", "IDLE", "DND", "INVISIBLE", "OFFLINE"];
    if (status && !validStatuses.includes(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    // Store previous status before updating
    const updateData: any = {};
    if (status) {
      updateData.prevStatus = profile.status;
      updateData.status = status;
    }
    if (presenceStatus !== undefined) {
      updateData.presenceStatus = presenceStatus || null;
    }

    // Update the user's status
    const updatedProfile = await db.profile.update({
      where: {
        id: profile.id,
      },
      data: updateData,
    });

    return NextResponse.json({
      status: updatedProfile.status,
      presenceStatus: updatedProfile.presenceStatus,
      isDND: updatedProfile.status === "DND"
    });
  } catch (error) {
    console.log("[USER_STATUS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
