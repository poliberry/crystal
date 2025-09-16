import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType } from "@/types/permissions";

export async function POST(
  req: Request,
  { params }: { params: { serverId: string; memberId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { roleId } = await req.json();
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

    // Check if role exists in the server
    const role = await db.role.findFirst({
      where: {
        id: roleId,
        serverId: serverId
      }
    });

    if (!role) {
      return new NextResponse("Role not found", { status: 404 });
    }

    // Check if actor can manage target (role hierarchy) - skip if owner
    if (!isOwner) {
      const canManageTarget = await PermissionManager.canManageTarget(
        member.id,
        targetMember.id,
        'MANAGE_ROLES'
      );

      if (!canManageTarget) {
        return new NextResponse("Cannot assign role to this member", { status: 403 });
      }
    }

    // Assign the role
    await PermissionManager.assignRole(memberId, roleId, profile.id);

    // Get updated member with roles
    const updatedMember = await db.member.findUnique({
      where: { id: memberId },
      include: {
        memberRoles: {
          include: {
            role: true
          }
        }
      }
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.log("[MEMBER_ROLE_ASSIGN]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { serverId: string; memberId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      return new NextResponse("Role ID required", { status: 400 });
    }

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

    // Check if actor can manage target (role hierarchy) - skip if owner
    if (!isOwner) {
      const canManageTarget = await PermissionManager.canManageTarget(
        member.id,
        targetMember.id,
        'MANAGE_ROLES'
      );

      if (!canManageTarget) {
        return new NextResponse("Cannot remove role from this member", { status: 403 });
      }
    }

    // Remove the role
    await PermissionManager.removeRole(memberId, roleId, profile.id);

    // Get updated member with roles
    const updatedMember = await db.member.findUnique({
      where: { id: memberId },
      include: {
        memberRoles: {
          include: {
            role: true
          }
        }
      }
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.log("[MEMBER_ROLE_REMOVE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
