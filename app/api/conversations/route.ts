import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { participantIds, type } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!participantIds || !Array.isArray(participantIds)) {
      return new NextResponse("Participant IDs are required", { status: 400 });
    }

    if (type !== "DIRECT_MESSAGE") {
      return new NextResponse("Only direct messages are supported", { status: 400 });
    }

    if (participantIds.length !== 1) {
      return new NextResponse("Direct messages require exactly one other participant", { status: 400 });
    }

    const otherProfileId = participantIds[0];

    if (otherProfileId === profile.id) {
      return new NextResponse("Cannot create conversation with yourself", { status: 400 });
    }
    // Use the existing conversation utility
    const { getOrCreateConversation } = await import("@/lib/conversation");
    
    const conversation = await getOrCreateConversation(profile.id, otherProfileId);

    if (!conversation) {
      return new NextResponse("Failed to create conversation", { status: 500 });
    }

    // Trigger conversation sidebar refresh via socket
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/socket/refresh-conversations`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cookie": req.headers.get("cookie") || "",
        },
      });
    } catch (socketError) {
      console.log("[CONVERSATION_REFRESH_ERROR]", socketError);
      // Continue even if socket refresh fails
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.log("[CONVERSATIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
