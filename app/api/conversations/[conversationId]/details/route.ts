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

    const { conversationId } = await params;

    if (!conversationId) {
      return new NextResponse("Conversation ID missing", { status: 400 });
    }

    // Find the conversation with all members and their profiles
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        members: {
          some: {
            profileId: profile.id,
            leftAt: null,
          },
        },
      },
      include: {
        members: {
          where: {
            leftAt: null,
          },
          include: {
            profile: true,
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
        id: conversationMember.id,
        conversationId: conversationMember.conversationId,
        profileId: conversationMember.profileId,
        profile: {
          id: conversationMember.profile.id,
          userId: conversationMember.profile.userId,
          name: conversationMember.profile.name,
          globalName: conversationMember.profile.globalName,
          imageUrl: conversationMember.profile.imageUrl,
          email: conversationMember.profile.email,
          bio: conversationMember.profile.bio,
          pronouns: conversationMember.profile.pronouns,
          status: conversationMember.profile.status,
          createdAt: conversationMember.profile.createdAt,
          updatedAt: conversationMember.profile.updatedAt,
          customCss: conversationMember.profile.customCss,
          allowNonFriendDMs: conversationMember.profile.allowNonFriendDMs,
          friendRequestPrivacy: conversationMember.profile.friendRequestPrivacy,
        },
        memberId: conversationMember.memberId,
        joinedAt: conversationMember.joinedAt,
        leftAt: conversationMember.leftAt,
        lastReadAt: conversationMember.lastReadAt,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.log("[CONVERSATION_DETAILS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
