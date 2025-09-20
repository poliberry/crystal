import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    console.log("[DEBUG_SIMPLE] Starting simple debug test");
    
    const profile = await currentProfile();
    console.log("[DEBUG_SIMPLE] Profile:", profile?.id);
    
    if (!profile) {
      return NextResponse.json({ error: "No profile", step: "profile" });
    }

    // Try to get any server for this profile
    const servers = await db.server.findMany({
      profileId: profile.id,
    });
    
    console.log("[DEBUG_SIMPLE] Found servers:", servers?.length);
    
    if (!servers || servers.length === 0) {
      return NextResponse.json({ 
        error: "No servers found", 
        step: "servers",
        profileId: profile.id 
      });
    }

    const firstServer = servers[0];
    console.log("[DEBUG_SIMPLE] First server:", firstServer.id);

    // Try to get members for the first server
    const members = await db.member.findMany({
      serverId: firstServer.id,
    });
    
    console.log("[DEBUG_SIMPLE] Found members:", members?.length);

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      serverCount: servers.length,
      firstServerId: firstServer.id,
      memberCount: members?.length || 0,
      members: members || []
    });

  } catch (error) {
    console.error("[DEBUG_SIMPLE] Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack"
    }, { status: 500 });
  }
}
