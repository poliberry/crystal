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

    const { name, color, hoisted, mentionable, permissions } = await req.json();
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

    // Update role
    const role = await db.role.update({
      where: {
        id: roleId,
        serverId: serverId
      },
      data: {
        name,
        color,
        hoisted,
        mentionable
      },
      include: {
        permissions: true
      }
    });

    // Update permissions if provided
    if (permissions) {
      // Delete existing permissions
      await db.rolePermission.deleteMany({
        where: {
          roleId: roleId
        }
      });

      // Create new permissions
      await db.rolePermission.createMany({
        data: permissions.map((perm: any) => ({
          roleId: roleId,
          permission: perm.permission,
          grant: perm.grant,
          scope: perm.scope,
          targetId: perm.targetId
        }))
      });
    }

    // Fetch updated role with permissions
    const updatedRole = await db.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
        memberRoles: {
          include: {
            member: {
              select: {
                id: true,
                profileId: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.log("[ROLE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { serverId: string; roleId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

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

    // Delete the role (cascade will handle related records)
    await db.role.delete({
      where: {
        id: roleId,
        serverId: serverId
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[ROLE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
