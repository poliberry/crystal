"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface ConversationParticipant {
  conversationId: string;
  profileId: string;
  name: string;
  imageUrl: string;
  unreadCount: number;
  conversationType: string;
}

export const ConversationNotificationBar = () => {
  const { notifications } = useNotifications();
  const { user } = useAuthStore();
  const profile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const markConversationAsRead = useMutation(api.notifications.markConversationAsRead);
  const router = useRouter();
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [clickingConversation, setClickingConversation] = useState<string | null>(null);

  // Process notifications to get conversation participants with unread counts
  const processNotifications = () => {
    const conversationMap = new Map<string, ConversationParticipant>();

    notifications
      .filter(n => n.conversationId && !n.read && n.type === "MESSAGE")
      .forEach(notification => {
        const conversationId = notification.conversationId!;
        
        // For group chats, use conversation name and image
        if (notification.conversation?.type === "GROUP_MESSAGE") {
          const existing = conversationMap.get(conversationId);
          if (existing) {
            existing.unreadCount += 1;
          } else {
            conversationMap.set(conversationId, {
              conversationId,
              profileId: "", // No specific profile for group chats
              name: notification.conversation.name || "Group Chat",
              imageUrl: "", // Default group image
              unreadCount: 1,
              conversationType: "GROUP_MESSAGE",
            });
          }
        } else {
          // For direct messages, use the sender's profile
          if (notification.triggeredBy && notification.triggeredBy.name !== profile?.globalName && notification.triggeredBy.name !== profile?.name) {
            const existing = conversationMap.get(conversationId);
            if (existing) {
              existing.unreadCount += 1;
            } else {
              conversationMap.set(conversationId, {
                conversationId,
                profileId: notification.profileId, // The sender's profile ID
                name: notification.triggeredBy.name,
                imageUrl: notification.triggeredBy.imageUrl,
                unreadCount: 1,
                conversationType: "DIRECT_MESSAGE",
              });
            }
          }
        }
      });

    setParticipants(Array.from(conversationMap.values()));
  };

  // Process notifications whenever they change
  useEffect(() => {
    processNotifications();
  }, [notifications, user]);

  const handleConversationClick = async (conversationId: string) => {
    // Prevent double clicks
    if (clickingConversation === conversationId) return;
    
    setClickingConversation(conversationId);
    
    // Immediately remove from UI for instant feedback
    setParticipants(prev => prev.filter(p => p.conversationId !== conversationId));
    
    try {
      // Mark conversation as read via Convex
      await markConversationAsRead({
        conversationId: conversationId as any,
      });

      // Navigate to the conversation after successful update
      router.push(`/conversations/${conversationId}`);
    } catch (error) {
      console.error("Failed to mark conversation as read:", error);
      // Revert UI change on error by reprocessing notifications
      processNotifications();
    } finally {
      setClickingConversation(null);
    }
  };

  return (
    <div className="flex items-center space-x-2 mx-1">
      <AnimatePresence>
        {participants.map((participant) => (
          <motion.div
            key={participant.conversationId}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <ActionTooltip
              side="bottom"
              align="center"
              label={`${participant.unreadCount} new message${participant.unreadCount > 1 ? 's' : ''} from ${participant.name}`}
            >
              <button
                onClick={() => handleConversationClick(participant.conversationId)}
                disabled={clickingConversation === participant.conversationId}
                className="relative group flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-neutral-800 group-hover:bg-blue-500 dark:group-hover:bg-blue-600 transition-all overflow-hidden hover:shadow-lg hover:-translate-y-0.5 border-2 border-transparent group-hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {participant.conversationType === "GROUP_MESSAGE" ? (
                  <div className="flex items-center justify-center h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full text-xs font-bold shadow-inner">
                    G
                  </div>
                ) : (
                  <UserAvatar
                    src={participant.imageUrl}
                    alt={participant.name}
                    className="h-8 w-8 ring-2 ring-white dark:ring-neutral-700 group-hover:ring-blue-200"
                  />
                )}
                
                {/* Unread count badge */}
                <div className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg border-2 border-white dark:border-neutral-800">
                  {participant.unreadCount > 9 ? '9+' : participant.unreadCount}
                </div>
              </button>
            </ActionTooltip>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
