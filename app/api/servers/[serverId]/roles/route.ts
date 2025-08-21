import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType, PermissionScope, PermissionGrantType } from "@/types/permissions";

export async function GET(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { serverId } = params;

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

    // Check if member has permission to view roles (skip if owner)
    if (!isOwner) {
      const canViewRoles = await PermissionManager.hasPermission(
        member.id,
        PermissionType.MANAGE_ROLES
      );

      if (!canViewRoles.granted) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Get all roles for the server
    const roles = await db.role.findMany({
      where: {
        serverId: serverId
      },
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
      },
      orderBy: {
        position: 'desc'
      }
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.log("[ROLES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, color, hoisted, mentionable, permissions } = await req.json();
    const { serverId } = params;

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

    // Get the highest position of existing roles to set new role position
    const highestRole = await db.role.findFirst({
      where: { serverId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const newPosition = (highestRole?.position || 0) + 1;

    // Create the role
    const role = await PermissionManager.createRole(
      serverId,
      name,
      permissions || [],
      {
        color,
        hoisted: hoisted || false,
        mentionable: mentionable || false,
        position: newPosition
      }
    );

    return NextResponse.json(role);
  } catch (error) {
    console.log("[ROLES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
