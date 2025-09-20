import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    console.log("[DEBUG_DB] Testing database connection");
    
    // Just test if we can connect to the database at all
    const testResult = await db.server.findFirst({});
    
    console.log("[DEBUG_DB] Test query result:", testResult ? "SUCCESS" : "NO_DATA");
    
    return NextResponse.json({
      success: true,
      hasData: !!testResult,
      dbConnected: true
    });

  } catch (error) {
    console.error("[DEBUG_DB] Database error:", error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack"
    }, { status: 500 });
  }
}
