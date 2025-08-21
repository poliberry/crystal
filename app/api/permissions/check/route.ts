import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType, PermissionScope } from "@/types/permissions";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { memberId, permission, scope, targetId } = await req.json();

    if (!memberId || !permission) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const result = await PermissionManager.hasPermission(
      memberId,
      permission as PermissionType,
      scope as PermissionScope || PermissionScope.SERVER,
      targetId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.log("[PERMISSION_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Batch permission check
export async function PUT(req: NextRequest) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { memberId, permissions } = await req.json();

    if (!memberId || !Array.isArray(permissions)) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const results = await Promise.all(
      permissions.map(async (perm: any) => {
        const result = await PermissionManager.hasPermission(
          memberId,
          perm.permission as PermissionType,
          perm.scope as PermissionScope || PermissionScope.SERVER,
          perm.targetId
        );
        return {
          permission: perm.permission,
          scope: perm.scope,
          targetId: perm.targetId,
          ...result
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.log("[PERMISSION_BATCH_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
