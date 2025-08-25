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

    const { memberId, permission, scope, targetId } = await req.json();

    if (!memberId || !permission) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const result = await SimplePermissions.hasPermission(
      memberId,
      permission as PermissionType,
      scope as PermissionScope || PermissionScope.SERVER,
      targetId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.log("[SIMPLE_PERMISSION_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
