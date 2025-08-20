import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

interface CreateNotificationOptions {
  type: NotificationType;
  title: string;
  content?: string;
  recipientProfileIds: string[];
  triggeredById?: string;
  serverId?: string;
  channelId?: string;
  conversationId?: string;
  messageId?: string;
  directMessageId?: string;
  groupKey?: string;
}

export async function createNotification(options: CreateNotificationOptions) {
  try {
    // Filter out recipients who are in DND mode
    const recipientsWithStatus = await db.profile.findMany({
      where: {
        id: {
          in: options.recipientProfileIds,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    // Only include recipients who are not in DND mode
    const filteredRecipientIds = recipientsWithStatus
      .filter(profile => profile.status !== "DND")
      .map(profile => profile.id);

    if (filteredRecipientIds.length === 0) {
      // No recipients to notify (all are in DND mode)
      return [];
    }

    const notifications = await Promise.all(
      filteredRecipientIds.map((recipientId) =>
        db.notification.create({
          data: {
            type: options.type,
            title: options.title,
            content: options.content,
            profileId: recipientId,
            triggeredById: options.triggeredById,
            serverId: options.serverId,
            channelId: options.channelId,
            conversationId: options.conversationId,
            messageId: options.messageId,
            directMessageId: options.directMessageId,
            groupKey: options.groupKey,
          },
          include: {
            triggeredBy: {
              select: {
                id: true,
                name: true,
                globalName: true,
                imageUrl: true,
              },
            },
            server: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
            channel: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            conversation: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        })
      )
    );

    // Emit socket events for each notification
    for (const notification of notifications) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/socket/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notification,
            recipientId: notification.profileId,
          }),
        });
      } catch (error) {
        console.error('Failed to emit notification socket event:', error);
      }
    }

    return notifications;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

export async function createMessageNotification(
  message: any,
  messageType: 'channel' | 'direct' | 'group',
  excludeProfileIds: string[] = []
) {
  let recipientProfileIds: string[] = [];
  let title = '';
  let content = message.content;
  let serverId: string | undefined;
  let channelId: string | undefined;
  let conversationId: string | undefined;

  if (messageType === 'channel') {
    // For channel messages, notify all server members except the sender
    const serverMembers = await db.member.findMany({
      where: {
        serverId: message.channel?.serverId,
        profileId: {
          notIn: [...excludeProfileIds, message.member.profileId],
        },
      },
      select: {
        profileId: true,
      },
    });

    recipientProfileIds = serverMembers.map(m => m.profileId);
    title = `New message in #${message.channel?.name}`;
    serverId = message.channel?.serverId;
    channelId = message.channelId;
  } else {
    // For DM/group messages, notify conversation members except sender
    const conversationMembers = await db.conversationMember.findMany({
      where: {
        conversationId: message.conversationId,
        leftAt: null,
        member: {
          profileId: {
            notIn: [...excludeProfileIds, message.member.profileId],
          },
        },
      },
      include: {
        member: {
          select: {
            profileId: true,
          },
        },
      },
    });

    recipientProfileIds = conversationMembers.map(cm => cm.member.profileId);
    
    if (messageType === 'group') {
      title = `${message.member.profile.globalName || message.member.profile.name} in ${message.conversation?.name || 'Group Chat'}`;
    } else {
      title = `${message.member.profile.globalName || message.member.profile.name}`;
    }
    
    conversationId = message.conversationId;
  }

  if (recipientProfileIds.length > 0) {
    await createNotification({
      type: NotificationType.MESSAGE,
      title,
      content: content?.length > 100 ? content.substring(0, 100) + '...' : content,
      recipientProfileIds,
      triggeredById: message.member.profileId,
      serverId,
      channelId,
      conversationId,
      messageId: message.id,
      directMessageId: messageType !== 'channel' ? message.id : undefined,
    });
  }
}

export async function createMentionNotification(
  message: any,
  mentionedProfileIds: string[],
  messageType: 'channel' | 'direct' | 'group'
) {
  let title = '';
  let serverId: string | undefined;
  let channelId: string | undefined;
  let conversationId: string | undefined;

  if (messageType === 'channel') {
    title = `You were mentioned in #${message.channel?.name}`;
    serverId = message.channel?.serverId;
    channelId = message.channelId;
  } else {
    if (messageType === 'group') {
      title = `You were mentioned by ${message.member.profile.globalName || message.member.profile.name} in ${message.conversation?.name || 'Group Chat'}`;
    } else {
      title = `You were mentioned by ${message.member.profile.globalName || message.member.profile.name}`;
    }
    conversationId = message.conversationId;
  }

  await createNotification({
    type: NotificationType.MENTION,
    title,
    content: message.content?.length > 100 ? message.content.substring(0, 100) + '...' : message.content,
    recipientProfileIds: mentionedProfileIds,
    triggeredById: message.member.profileId,
    serverId,
    channelId,
    conversationId,
    messageId: message.id,
    directMessageId: messageType !== 'channel' ? message.id : undefined,
  });
}
