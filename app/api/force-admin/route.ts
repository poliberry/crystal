import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Get the first member (for testing only)
    const member = await db.member.findFirst({
      select: {
        id: true,
        profileId: true,
        serverId: true
      }
    });

    if (!member) {
      return NextResponse.json({ error: "No members found" }, { status: 404 });
    }

    // Grant ADMINISTRATOR permission
    const result = await db.userPermission.upsert({
      where: {
        memberId_permission_scope_targetId: {
          memberId: member.id,
          permission: 'ADMINISTRATOR',
          scope: 'SERVER',
          targetId: ''
        }
      },
      update: {
        grant: 'ALLOW',
        assignedBy: member.profileId
      },
      create: {
        memberId: member.id,
        permission: 'ADMINISTRATOR',
        scope: 'SERVER',
        targetId: null,
        grant: 'ALLOW',
        assignedBy: member.profileId
      }
    });

    // Verify the permission was created
    const verification = await db.userPermission.findMany({
      where: {
        memberId: member.id,
        permission: 'ADMINISTRATOR'
      }
    });

    return NextResponse.json({
      success: true,
      member,
      result,
      verification
    });

  } catch (error) {
    console.error("[FORCE_ADMIN]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
