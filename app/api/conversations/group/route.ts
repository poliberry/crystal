import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { createGroupConversation } from "@/lib/conversation";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { creatorId, memberIds, name } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!creatorId || !memberIds || !Array.isArray(memberIds)) {
      return new NextResponse("Creator ID and member IDs are required", { status: 400 });
    }

    if (memberIds.length === 0) {
      return new NextResponse("At least one member is required", { status: 400 });
    }

    const conversation = await createGroupConversation(creatorId, memberIds, name);

    if (!conversation) {
      return new NextResponse("Failed to create group conversation", { status: 500 });
    }

    // Trigger conversation refresh for all members
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/socket/refresh-conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          type: 'conversation_created'
        }),
      });
    } catch (error) {
      console.error('Failed to trigger conversation refresh:', error);
      // Don't fail the request if refresh fails
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.log("[CONVERSATIONS_GROUP_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
