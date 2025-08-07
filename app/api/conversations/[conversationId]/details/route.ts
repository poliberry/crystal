import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId } = params;

    if (!conversationId) {
      return new NextResponse("Conversation ID missing", { status: 400 });
    }

    // Find the conversation with all members and their profiles
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        members: {
          some: {
            member: {
              profileId: profile.id,
            },
          },
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
      return new NextResponse("Conversation not found", { status: 404 });
    }

    // Format the response
    const response = {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      members: conversation.members.map((conversationMember) => ({
        member: {
          id: conversationMember.member.id,
          profile: {
            id: conversationMember.member.profile.id,
            name: conversationMember.member.profile.name,
            globalName: conversationMember.member.profile.globalName,
            imageUrl: conversationMember.member.profile.imageUrl,
            email: conversationMember.member.profile.email,
            bio: conversationMember.member.profile.bio,
            pronouns: conversationMember.member.profile.pronouns,
            status: conversationMember.member.profile.status,
            createdAt: conversationMember.member.profile.createdAt,
            updatedAt: conversationMember.member.profile.updatedAt,
          },
        },
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.log("[CONVERSATION_DETAILS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
