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

    // First, check if a conversation already exists between these profiles
    const existingConversation = await db.conversation.findFirst({
      where: {
        type: "DIRECT_MESSAGE",
        AND: [
          {
            members: {
              some: {
                member: {
                  profileId: profile.id,
                },
                leftAt: null,
              },
            },
          },
          {
            members: {
              some: {
                member: {
                  profileId: otherProfileId,
                },
                leftAt: null,
              },
            },
          },
        ],
      },
      include: {
        members: {
          where: {
            leftAt: null,
          },
          include: {
            member: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    // Find member records for both profiles from any shared server
    const [currentMembers, otherMembers] = await Promise.all([
      db.member.findMany({
        where: { profileId: profile.id },
      }),
      db.member.findMany({
        where: { profileId: otherProfileId },
      })
    ]);

    // Try to find a shared server where both users are members
    let currentMember = null;
    let otherMember = null;

    for (const currMember of currentMembers) {
      const foundOtherMember = otherMembers.find(
        (otherMem) => otherMem.serverId === currMember.serverId
      );
      if (foundOtherMember) {
        currentMember = currMember;
        otherMember = foundOtherMember;
        break;
      }
    }

    // If no shared server, use any available member records
    if (!currentMember && currentMembers.length > 0) {
      currentMember = currentMembers[0];
    }

    if (!otherMember && otherMembers.length > 0) {
      otherMember = otherMembers[0];
    }

    // If either user has no server memberships, they can't create conversations yet
    if (!currentMember) {
      return new NextResponse("Current user must be a member of at least one server", { status: 400 });
    }

    if (!otherMember) {
      return new NextResponse("Target user must be a member of at least one server", { status: 400 });
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        type: "DIRECT_MESSAGE",
        members: {
          create: [
            {
              memberId: currentMember.id,
            },
            {
              memberId: otherMember.id,
            },
          ],
        },
      },
      include: {
        members: {
          include: {
            member: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

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
