import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType } from "@/types/permissions";

export async function PATCH(
  req: Request,
  { params }: { params: { serverId: string; roleId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { position } = await req.json();
    const { serverId, roleId } = params;

    // Check if user is member of the server
    const member = await db.member.findFirst({
      where: {
        profileId: profile.id,
        serverId: serverId
      }
    });

    if (!member) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Check if user is the server owner
    const server = await db.server.findUnique({
      where: { id: serverId },
      select: { profileId: true }
    });

    const isOwner = server?.profileId === profile.id;

    // Check if member has permission to manage roles (skip if owner)
    if (!isOwner) {
      const canManageRoles = await PermissionManager.hasPermission(
        member.id,
        PermissionType.MANAGE_ROLES
      );

      if (!canManageRoles.granted) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Update role position
    const role = await db.role.update({
      where: {
        id: roleId,
        serverId: serverId
      },
      data: {
        position: position
      },
      include: {
        permissions: true
      }
    });

    return NextResponse.json(role);
  } catch (error) {
    console.log("[ROLE_POSITION_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
