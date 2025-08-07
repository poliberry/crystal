import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { getOrCreateConversation } from "@/lib/conversation";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { memberOneId, memberTwoId } = await req.json();

    console.log("Creating DM API called with:", { memberOneId, memberTwoId });

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!memberOneId || !memberTwoId) {
      return new NextResponse("Member IDs are required", { status: 400 });
    }

    if (memberOneId === memberTwoId) {
      return new NextResponse("Cannot create conversation with yourself", { status: 400 });
    }

    // Verify both members exist
    const [memberOne, memberTwo] = await Promise.all([
      db.member.findUnique({ where: { id: memberOneId } }),
      db.member.findUnique({ where: { id: memberTwoId } })
    ]);

    if (!memberOne) {
      return new NextResponse("Member one not found", { status: 404 });
    }

    if (!memberTwo) {
      return new NextResponse("Member two not found", { status: 404 });
    }

    console.log("Both members found, creating conversation...");

    const conversation = await getOrCreateConversation(memberOneId, memberTwoId);

    if (!conversation) {
      return new NextResponse("Failed to create conversation", { status: 500 });
    }

    console.log("Conversation created successfully:", conversation.id);

    // Trigger conversation refresh for both members
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
    console.log("[CONVERSATIONS_DIRECT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
