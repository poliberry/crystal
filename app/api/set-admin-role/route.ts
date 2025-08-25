import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { memberId } = await req.json();
    
    if (!memberId) {
      return new NextResponse("Missing memberId", { status: 400 });
    }

    console.log('Setting member role to ADMIN for:', memberId);
    
    // Update the member role to ADMIN
    const updatedMember = await db.member.update({
      where: { id: memberId },
      data: { role: 'ADMIN' },
      include: { profile: true }
    });
    
    console.log('✅ Member role updated to ADMIN for:', updatedMember.profile.name);
    
    return NextResponse.json({ 
      success: true, 
      message: "Member role updated to ADMIN",
      member: updatedMember.profile.name,
      newRole: updatedMember.role
    });
    
  } catch (error) {
    console.error('Error updating member role:', error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
