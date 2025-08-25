import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { SimplePermissions } from "@/lib/simple-permissions";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { memberId, action } = await req.json();

    if (!memberId || !action) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get the member to verify it exists
    const member = await db.member.findUnique({
      where: { id: memberId },
      select: { profileId: true, serverId: true }
    });

    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // Only allow the profile owner or existing admin to modify permissions
    if (member.profileId !== profile.id) {
      // Check if the current user is an admin
      const currentMember = await db.member.findFirst({
        where: {
          profileId: profile.id,
          serverId: member.serverId
        }
      });

      if (!currentMember) {
        return new NextResponse("Not a member of this server", { status: 403 });
      }

      const canManage = await SimplePermissions.hasPermission(currentMember.id, "ADMINISTRATOR" as any);
      if (!canManage.granted && currentMember.role !== 'ADMIN') {
        return new NextResponse("Not authorized to modify permissions", { status: 403 });
      }
    }

    if (action === 'grant') {
      await SimplePermissions.grantAdminPermission(memberId, profile.id);
      return NextResponse.json({ success: true, message: 'Admin permission granted' });
    } else if (action === 'revoke') {
      await SimplePermissions.revokeAdminPermission(memberId);
      return NextResponse.json({ success: true, message: 'Admin permission revoked' });
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }

  } catch (error) {
    console.log("[ADMIN_PERMISSION_MANAGE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
