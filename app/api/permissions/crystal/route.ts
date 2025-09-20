import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { CrystalPermissions } from "@/lib/crystal-permissions";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      console.log("[CRYSTAL_PERMISSIONS] No profile found");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { memberId } = await req.json();
    console.log("[CRYSTAL_PERMISSIONS] TEMPORARY DEBUG - Request for memberId:", memberId, "from profile:", profile.id);

    if (!memberId) {
      return new NextResponse("Missing memberId", { status: 400 });
    }

    // TEMPORARY: Just return server owner permissions for testing
    console.log("[CRYSTAL_PERMISSIONS] TEMPORARY - Returning hard-coded server owner permissions for testing");
    const ownerPermissions = {
      canManageServer: true,
      canDeleteServer: true, // Server owner can delete
      canManageRoles: true,
      canManageMembers: true,
      canViewAuditLog: true,
      canManageChannels: true,
      canCreateChannels: true,
      canDeleteChannels: true,
      canManageCategories: true,
      canKickMembers: true,
      canBanMembers: true,
      canInviteMembers: true,
      canSendMessages: true,
      canViewChannels: true,
      canConnectToVoice: true,
      isServerOwner: true, // Mark as server owner
      isAdmin: true,
    };
    return NextResponse.json(ownerPermissions);

  } catch (error) {
    console.log("[CRYSTAL_PERMISSIONS] DETAILED ERROR:");
    console.log("[CRYSTAL_PERMISSIONS] Error message:", error instanceof Error ? error.message : error);
    console.log("[CRYSTAL_PERMISSIONS] Error stack:", error instanceof Error ? error.stack : "No stack");
    console.log("[CRYSTAL_PERMISSIONS] Error type:", typeof error);
    console.log("[CRYSTAL_PERMISSIONS] Raw error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
