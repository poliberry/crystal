import { MemberRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });

    const { items } = await req.json();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");

    if (!serverId)
      return new NextResponse("Server ID is missing.", { status: 400 });

    if (!items || !Array.isArray(items))
      return new NextResponse("Items array is missing.", { status: 400 });

    // Check if user has permission to reorder categories
    const server = await db.server.findFirst({
      where: {
        id: serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR],
            },
          },
        },
      },
    });

    if (!server) return new NextResponse("Server not found.", { status: 404 });

    // Update category positions
    const updatePromises = items.map((item: { id: string; position: number }) =>
      db.category.update({
        where: { id: item.id },
        data: { position: item.position },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[CATEGORIES_REORDER_PATCH]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
