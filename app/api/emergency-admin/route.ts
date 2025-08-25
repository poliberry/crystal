import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { memberId } = await req.json();
    
    if (!memberId) {
      return new NextResponse("Missing memberId", { status: 400 });
    }

    console.log('Emergency admin grant for member:', memberId);
    
    // First, check if the member exists
    const member = await db.member.findUnique({
      where: { id: memberId },
      include: { profile: true }
    });
    
    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }
    
    console.log('Found member:', member.profile.name);
    
    // Grant ADMINISTRATOR permission
    await db.userPermission.upsert({
      where: {
        memberId_permission_scope_targetId: {
          memberId: memberId,
          permission: 'ADMINISTRATOR',
          scope: 'SERVER',
          targetId: member.serverId
        }
      },
      update: {
        grant: 'ALLOW'
      },
      create: {
        memberId: memberId,
        permission: 'ADMINISTRATOR',
        scope: 'SERVER',
        grant: 'ALLOW',
        targetId: member.serverId,
        assignedBy: member.profileId, // Self-assigned for emergency
        reason: 'Emergency admin grant'
      }
    });
    
    console.log('✅ Admin permission granted successfully!');
    
    return NextResponse.json({ 
      success: true, 
      message: "Admin permission granted",
      member: member.profile.name
    });
    
  } catch (error) {
    console.error('Error granting admin permission:', error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
