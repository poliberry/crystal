import { db } from "./db";
import { ConversationType } from "@prisma/client";

export const getOrCreateConversation = async (
  memberOneId: string,
  memberTwoId: string,
) => {
  // Find existing conversation between these two members
  let conversation = await findConversation(memberOneId, memberTwoId);

  if (!conversation) {
    conversation = await createNewConversation(memberOneId, memberTwoId);
  }

  return conversation;
};

const findConversation = async (memberOneId: string, memberTwoId: string) => {
  try {
    // Find a direct message conversation where both members are participants
    return await db.conversation.findFirst({
      where: {
        type: "DIRECT_MESSAGE" as any, // Use string literal as fallback
        AND: [
          {
            members: {
              some: {
                memberId: memberOneId,
                leftAt: null,
              },
            },
          },
          {
            members: {
              some: {
                memberId: memberTwoId,
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
  } catch (error) {
    console.error("Error finding conversation:", error);
    return null;
  }
};

const createNewConversation = async (
  memberOneId: string,
  memberTwoId: string,
) => {
  try {
    console.log("Creating conversation between:", { memberOneId, memberTwoId });
    
    const conversation = await db.conversation.create({
      data: {
        type: "DIRECT_MESSAGE" as any, // Use string literal as fallback
        members: {
          create: [
            {
              memberId: memberOneId,
            },
            {
              memberId: memberTwoId,
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
    
    console.log("Successfully created conversation:", conversation.id);
    return conversation;
  } catch (error) {
    console.error("Error creating conversation:", error);
    return null;
  }
};

// Create a group conversation
export const createGroupConversation = async (
  creatorId: string,
  memberIds: string[],
  name?: string,
) => {
  try {
    // Include the creator in the member list if not already present
    const allMemberIds = Array.from(new Set([creatorId, ...memberIds]));

    return await db.conversation.create({
      data: {
        type: "GROUP_MESSAGE" as any, // Use string literal as fallback
        name,
        creatorId,
        members: {
          create: allMemberIds.map((memberId) => ({
            memberId,
          })),
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
        creator: {
          include: {
            profile: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error creating group conversation:", error);
    return null;
  }
};

// Add members to an existing conversation
export const addMembersToConversation = async (
  conversationId: string,
  memberIds: string[],
) => {
  try {
    await db.conversationMember.createMany({
      data: memberIds.map((memberId) => ({
        conversationId,
        memberId,
      })),
      skipDuplicates: true,
    });

    return await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { leftAt: null },
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
  } catch {
    return null;
  }
};

// Remove a member from a conversation (set leftAt timestamp)
export const removeMemberFromConversation = async (
  conversationId: string,
  memberId: string,
) => {
  try {
    await db.conversationMember.updateMany({
      where: {
        conversationId,
        memberId,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
      },
    });

    return true;
  } catch {
    return false;
  }
};
