import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { currentProfile } from "@/lib/current-profile";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId, type, callerId, callerName, callerAvatar, participantIds } = await req.json();

    // Trigger Pusher event for call start
    await pusherServer.trigger("presence-global", "call:incoming", {
      conversationId,
      type,
      callerId,
      callerName,
      callerAvatar,
      participantIds,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CALL_START_PUSHER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
