import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { getOrCreateConversation } from "@/lib/conversation";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { profileOneId, profileTwoId } = await req.json();

    console.log("Creating DM API called with:", { profileOneId, profileTwoId });

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!profileOneId || !profileTwoId) {
      return new NextResponse("Profile IDs are required", { status: 400 });
    }

    if (profileOneId === profileTwoId) {
      return new NextResponse("Cannot create conversation with yourself", { status: 400 });
    }

    // Verify both profiles exist
    const [profileOne, profileTwo] = await Promise.all([
      db.profile.findUnique({ where: { id: profileOneId } }),
      db.profile.findUnique({ where: { id: profileTwoId } })
    ]);

    if (!profileOne) {
      return new NextResponse("Profile one not found", { status: 404 });
    }

    if (!profileTwo) {
      return new NextResponse("Profile two not found", { status: 404 });
    }

    console.log("Both profiles found, creating conversation...");

    const conversation = await getOrCreateConversation(profileOneId, profileTwoId);

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
