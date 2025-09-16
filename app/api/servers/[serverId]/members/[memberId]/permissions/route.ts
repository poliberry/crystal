import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType, PermissionScope } from "@/types/permissions";

export async function GET(
  req: Request,
  { params }: { params: { serverId: string; memberId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const permission = searchParams.get("permission") as PermissionType;
    const scope = searchParams.get("scope") as PermissionScope || PermissionScope.SERVER;
    const targetId = searchParams.get("targetId") || undefined;

    const { serverId, memberId } = params;

    // Check if user is member of the server and can view permissions
    const member = await db.member.findFirst({
      where: {
        profileId: profile.id,
        serverId: serverId
      }
    });

    if (!member) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Only allow checking own permissions or if user can manage roles
    if (member.id !== memberId) {
      const canViewPermissions = await PermissionManager.hasPermission(
        member.id,
        PermissionType.MANAGE_ROLES
      );

      if (!canViewPermissions.granted) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Check if target member exists
    const targetMember = await db.member.findFirst({
      where: {
        id: memberId,
        serverId: serverId
      }
    });

    if (!targetMember) {
      return new NextResponse("Target member not found", { status: 404 });
    }

    if (permission) {
      // Check specific permission
      const result = await PermissionManager.hasPermission(
        memberId,
        permission,
        scope,
        targetId
      );

      return NextResponse.json(result);
    } else {
      // Get all effective permissions
      const permissions = await PermissionManager.getEffectivePermissions(
        memberId,
        scope,
        targetId
      );

      return NextResponse.json({ permissions });
    }
  } catch (error) {
    console.log("[MEMBER_PERMISSIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { serverId: string; memberId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { permission, grant, scope, targetId, reason, expiresAt } = await req.json();
    const { serverId, memberId } = params;

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

    // Check if member has permission to manage roles/permissions
    const canManageRoles = await PermissionManager.hasPermission(
      member.id,
      PermissionType.MANAGE_ROLES
    );

    if (!canManageRoles.granted) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if target member exists
    const targetMember = await db.member.findFirst({
      where: {
        id: memberId,
        serverId: serverId
      }
    });

    if (!targetMember) {
      return new NextResponse("Target member not found", { status: 404 });
    }

    // Check if actor can manage target (role hierarchy)
    const canManageTarget = await PermissionManager.canManageTarget(
      member.id,
      targetMember.id,
      'MANAGE_ROLES'
    );

    if (!canManageTarget) {
      return new NextResponse("Cannot modify permissions for this member", { status: 403 });
    }

    // Set the permission override
    await PermissionManager.setUserPermission(
      memberId,
      permission,
      grant,
      profile.id,
      scope,
      targetId,
      reason,
      expiresAt ? new Date(expiresAt) : undefined
    );

    // Get updated permissions
    const permissions = await PermissionManager.getEffectivePermissions(
      memberId,
      scope,
      targetId
    );

    return NextResponse.json({ permissions });
  } catch (error) {
    console.log("[MEMBER_PERMISSIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
