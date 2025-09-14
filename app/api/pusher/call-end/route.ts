import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { currentProfile } from "@/lib/current-profile";

export async function POST(req: NextRequest) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId, type } = await req.json();

    // Trigger Pusher event for call end
    await pusherServer.trigger("presence-global", "call:ended", {
      conversationId,
      type,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CALL_END_PUSHER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
