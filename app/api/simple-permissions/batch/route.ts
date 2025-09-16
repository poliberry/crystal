import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { SimplePermissions } from "@/lib/simple-permissions";
import { PermissionType, PermissionScope } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { memberId, permissions } = await req.json();

    if (!memberId || !Array.isArray(permissions)) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const results = await SimplePermissions.hasPermissions(
      memberId,
      permissions.map((perm: any) => ({
        permission: perm.permission as PermissionType,
        scope: perm.scope as PermissionScope || PermissionScope.SERVER,
        targetId: perm.targetId
      }))
    );

    return NextResponse.json(results);
  } catch (error) {
    console.log("[SIMPLE_PERMISSION_BATCH_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
