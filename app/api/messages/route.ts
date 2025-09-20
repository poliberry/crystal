import { NextResponse, type NextRequest } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import type { Message } from "@prisma/client";

const MESSAGES_BATCH = 10;

export async function GET(req: NextRequest) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const channelId = searchParams.get("channelId");

    if (!profile) return new NextResponse("Unauthorized.", { status: 401 });
    if (!channelId)
      return new NextResponse("Channel ID is missing.", { status: 401 });

    console.log('[MESSAGES_GET] - channelId:', channelId, 'cursor:', cursor);

    // For now, get basic messages without complex pagination
    // TODO: Implement proper cursor-based pagination in ScyllaDB
    const messages = await db.message.findMany(
      { channelId },
      { take: MESSAGES_BATCH }
    );

    console.log('[MESSAGES_GET] - found messages:', messages.length);

    // For now, return simple messages without member/profile data
    // TODO: Implement proper joins or separate queries for member data
    const formattedMessages = messages.map((message: any) => ({
      ...message,
      member: {
        id: message.memberId,
        role: 'GUEST', // Default role for now
        profile: {
          id: profile.id,
          name: 'User', // Default name for now
          imageUrl: profile.imageUrl || '',
        },
      },
      attachments: [], // No attachments for now
    }));

    let nextCursor = null;
    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[messages.length - 1].id;
    }

    return NextResponse.json({
      items: formattedMessages,
      nextCursor,
    });
  } catch (error: unknown) {
    console.error("[MESSAGES_GET]: ", error);
    return new NextResponse("Internal Server Error.", { status: 500 });
  }
}
