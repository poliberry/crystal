import { db } from "./db";
import { ConversationType } from "@prisma/client";

export const getOrCreateConversation = async (
  profileOneId: string,
  profileTwoId: string,
) => {
  // Find existing conversation between these two profiles
  let conversation = await findConversation(profileOneId, profileTwoId);

  if (!conversation) {
    conversation = await createNewConversation(profileOneId, profileTwoId);
  }

  return conversation;
};

const findConversation = async (profileOneId: string, profileTwoId: string) => {
  try {
    // Find a direct message conversation where both profiles are participants
    return await db.conversation.findFirst({
      where: {
        type: "DIRECT_MESSAGE",
        AND: [
          {
            members: {
              some: {
                profileId: profileOneId,
                leftAt: null,
              },
            },
          },
          {
            members: {
              some: {
                profileId: profileTwoId,
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
            profile: true,
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
  profileOneId: string,
  profileTwoId: string,
) => {
  try {
    console.log("Creating conversation between profiles:", { profileOneId, profileTwoId });
    
    const conversation = await db.conversation.create({
      data: {
        type: "DIRECT_MESSAGE",
        members: {
          create: [
            {
              profileId: profileOneId,
            },
            {
              profileId: profileTwoId,
            },
          ],
        },
      },
      include: {
        members: {
          include: {
            profile: true,
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
  creatorProfileId: string,
  profileIds: string[],
  name?: string,
) => {
  try {
    // Include the creator in the member list if not already present
    const allProfileIds = Array.from(new Set([creatorProfileId, ...profileIds]));

    return await db.conversation.create({
      data: {
        type: "GROUP_MESSAGE",
        name,
        members: {
          create: allProfileIds.map((profileId) => ({
            profileId,
          })),
        },
      },
      include: {
        members: {
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
  profileIds: string[],
) => {
  try {
    await db.conversationMember.createMany({
      data: profileIds.map((profileId) => ({
        conversationId,
        profileId,
      })),
      skipDuplicates: true,
    });

    return await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            profile: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error adding members to conversation:", error);
    return null;
  }
};

// Remove a member from a conversation (set leftAt timestamp)
export const removeMemberFromConversation = async (
  conversationId: string,
  profileId: string,
) => {
  try {
    await db.conversationMember.updateMany({
      where: {
        conversationId,
        profileId,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error("Error removing member from conversation:", error);
    return false;
  }
};
