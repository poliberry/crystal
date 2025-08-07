import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get member record
    const member = await db.member.findFirst({
      where: {
        profileId: profile.id,
      },
    });

    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // More efficient query using the junction table directly
    const conversationMembers = await db.conversationMember.findMany({
      where: {
        memberId: member.id,
        leftAt: null, // Only active conversations
      },
      include: {
        conversation: {
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
            directMessages: {
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
              include: {
                member: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            creator: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: "desc",
        },
      },
    });

    const conversations = conversationMembers.map((cm) => cm.conversation);

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[CONVERSATIONS_LIST_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
