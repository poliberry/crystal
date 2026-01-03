"use client";

import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatItemIRC } from "./chat-item-irc";
import { ChatItemDefault } from "./chat-item-default";
import { ChatWelcome } from "./chat-welcome";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuthStore } from "@/lib/auth-store";
import { ScrollArea } from "../ui/scroll-area";

const DATE_FORMAT = "DD/MM/YY, HH:mm a";

type ChatMessagesProps = {
  name: string;
  member: any;
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
  type: "channel" | "conversation" | "personal-space";
};

export const ChatMessages = ({
  name,
  member,
  chatId,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
  type,
}: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingCursor, setLoadingCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { user } = useAuthStore();
  const userCustomisation = useQuery(
    api.userCustomisation.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );
  
  // Get initial messages (latest batch) - always call both hooks to maintain hook order
  const channelMessages = useQuery(
    api.messages.getByChannel,
    type === "channel" && user?.userId && chatId
      ? {
          userId: user.userId as string,
          channelId: chatId as Id<"channels">,
        }
      : "skip"
  );

  const conversationMessages = useQuery(
    api.directMessages.getByConversation,
    type !== "channel" && user?.userId && chatId
      ? {
          userId: user.userId as string,
          conversationId: chatId as Id<"conversations">,
        }
      : "skip"
  );

  // Use the appropriate messages based on type
  const initialMessages = type === "channel" ? channelMessages : conversationMessages;

  // Get older messages when loading more - always call both hooks to maintain hook order
  const olderChannelMessages = useQuery(
    api.messages.getByChannel,
    loadingCursor && type === "channel" && user?.userId && chatId
      ? {
          userId: user.userId as string,
          channelId: chatId as Id<"channels">,
          cursor: loadingCursor,
        }
      : "skip"
  );

  const olderConversationMessages = useQuery(
    api.directMessages.getByConversation,
    loadingCursor && type !== "channel" && user?.userId && chatId
      ? {
          userId: user.userId as string,
          conversationId: chatId as Id<"conversations">,
          cursor: loadingCursor,
        }
      : "skip"
  );

  // Use the appropriate older messages based on type
  const olderMessages = type === "channel" ? olderChannelMessages : olderConversationMessages;

  // Get typing indicators - always call hook to maintain hook order
  const typingIndicators = useQuery(
    api.typingIndicators.getTyping,
    user?.userId && chatId
      ? type === "channel"
        ? {
            channelId: chatId as Id<"channels">,
            userId: user.userId as string,
          }
        : {
            conversationId: chatId as Id<"conversations">,
            userId: user.userId as string,
          }
      : "skip"
  );

  // Load initial messages and merge new messages
  useEffect(() => {
    if (initialMessages) {
      setAllMessages((prev) => {
        // If we have no previous messages or this is a fresh load, replace
        if (prev.length === 0) {
          const items = (initialMessages.items || []).filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined);
          // Sort by createdAt ascending (oldest to newest) for display
          return items.sort((a, b) => a.createdAt - b.createdAt);
        }
        // Otherwise, merge new messages
        const existingIds = new Set(prev.filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined).map(m => m._id));
        const newItems = (initialMessages.items || []).filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined && !existingIds.has(m._id));
        if (newItems.length > 0) {
          // Merge and sort by createdAt ascending (oldest to newest)
          const merged = [...prev, ...newItems];
          // Deduplicate by ID to ensure no duplicates
          const filtered = merged.filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined);
          const unique = Array.from(
            new Map(filtered.map(m => [m._id, m])).values()
          );
          // Sort by createdAt ascending (oldest to newest)
          return unique.sort((a, b) => a.createdAt - b.createdAt);
        }
        // If no new items, check if the latest messages have changed (updates, etc.)
        // Still deduplicate and sort to be safe
        const merged = initialMessages.items || prev;
        const filtered = merged.filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined);
        const unique = Array.from(
          new Map(filtered.map(m => [m._id, m])).values()
        );
        // Sort by createdAt ascending (oldest to newest)
        return unique.sort((a, b) => a.createdAt - b.createdAt);
      });
      setNextCursor(initialMessages.nextCursor);
    }
  }, [initialMessages]);

  // Load older messages when loadingCursor is set
  useEffect(() => {
    if (olderMessages && loadingCursor) {
      if (olderMessages.items && olderMessages.items.length > 0) {
        // Append older messages and sort by createdAt ascending (oldest to newest)
        setAllMessages((prev) => {
          const existingIds = new Set(prev.filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined).map(m => m._id));
          const newItems = olderMessages.items.filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined && !existingIds.has(m._id));
          const merged = [...prev, ...newItems];
          // Deduplicate by ID to ensure no duplicates
          const filtered = merged.filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined);
          const unique = Array.from(
            new Map(filtered.map(m => [m._id, m])).values()
          );
          // Sort by createdAt ascending (oldest to newest)
          return unique.sort((a, b) => a.createdAt - b.createdAt);
        });
        setNextCursor(olderMessages.nextCursor);
      }
      setIsLoadingMore(false);
      setLoadingCursor(null);
    }
  }, [olderMessages, loadingCursor]);

  // Reset when chatId changes
  useEffect(() => {
    setAllMessages([]);
    setNextCursor(null);
    setLoadingCursor(null);
    setIsLoadingMore(false);
  }, [chatId]);

  // Use Intersection Observer to load more when top is visible
  useEffect(() => {
    if (!topRef.current || !nextCursor || isLoadingMore || loadingCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore && !loadingCursor) {
          setIsLoadingMore(true);
          setLoadingCursor(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(topRef.current);
    return () => observer.disconnect();
  }, [nextCursor, isLoadingMore, loadingCursor]);

  // Scroll to bottom when new messages arrive (but not when loading older messages)
  useEffect(() => {
    if (bottomRef.current && !loadingCursor && allMessages.length > 0) {
      // Only auto-scroll on new messages, not when loading history
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  }, [allMessages.length, typingIndicators?.length ?? 0, loadingCursor]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (bottomRef.current && allMessages.length > 0 && !loadingCursor) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [chatId]);

  if (initialMessages === undefined) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading messages...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 max-w-full overflow-hidden flex flex-col">
      <ScrollArea className="flex-1 w-full max-w-full min-w-0 max-h-[calc(100vh-100px)]">
        <div className="flex flex-col justify-end min-h-full w-full max-w-full min-w-0 py-4">
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
            </div>
          )}
          <ChatWelcome type={type} name={name} />
          <div ref={topRef} />
          {allMessages.map((message: any) => {
            // Normalize member data - ensure it always has a profile property
            // If message.member exists, use it (it already has profile nested)
            // If not, create a member-like object with the profile nested
            const normalizedMember = message.member || (message.profile ? {
              id: message.profile._id || message.profile.id,
              _id: message.profile._id || message.profile.id,
              profile: message.profile,
              profileId: message.profileId || message.profile._id || message.profile.id,
            } : null);

            if (!normalizedMember || !normalizedMember.profile) {
              return null;
            }
            
            // Ensure the normalized member has an id that can be compared with currentMember.id
            if (!normalizedMember.id && normalizedMember.profileId) {
              normalizedMember.id = normalizedMember.profileId;
            }
            if (!normalizedMember._id && normalizedMember.id) {
              normalizedMember._id = normalizedMember.id;
            }

            return (
              <div
                key={message._id}
                className="transition-opacity duration-150 ease-out w-full max-w-full min-w-0"
              >
                {userCustomisation?.chatMode === "DEFAULT" ? (
                  <ChatItemDefault
                    currentMember={member}
                    member={normalizedMember}
                    id={message._id}
                    content={message.content}
                    attachments={message.attachments}
                    deleted={message.deleted}
                    timestamp={dayjs(message.createdAt).format(DATE_FORMAT)}
                    isUpdated={message.updatedAt !== message.createdAt}
                    socketUrl={socketUrl}
                    socketQuery={socketQuery}
                  />
                ) : (
                  <ChatItemIRC
                    currentMember={member}
                    member={normalizedMember}
                    id={message._id}
                    content={message.content}
                    attachments={message.attachments}
                    deleted={message.deleted}
                    timestamp={dayjs(message.createdAt).format(DATE_FORMAT)}
                    socketUrl={socketUrl}
                    socketQuery={socketQuery}
                    isUpdated={message.updatedAt !== message.createdAt}
                  />
                )}
              </div>
            );
          })}
          
          {/* Typing Indicators */}
          {typingIndicators && Array.isArray(typingIndicators) && typingIndicators.length > 0 && (
            <div className="px-4 py-2 text-sm text-muted-foreground italic">
              {typingIndicators.length === 1 ? (
                <span>
                  {typingIndicators[0]?.profile?.name || typingIndicators[0]?.profile?.globalName || "Someone"} is typing...
                </span>
              ) : typingIndicators.length === 2 ? (
                <span>
                  {typingIndicators[0]?.profile?.name || typingIndicators[0]?.profile?.globalName || "Someone"} and{" "}
                  {typingIndicators[1]?.profile?.name || typingIndicators[1]?.profile?.globalName || "someone"} are typing...
                </span>
              ) : (
                <span>
                  {typingIndicators[0]?.profile?.name || typingIndicators[0]?.profile?.globalName || "Someone"} and{" "}
                  {typingIndicators.length - 1} others are typing...
                </span>
              )}
            </div>
          )}
          
          <div ref={bottomRef} className="aria-hidden" />
        </div>
      </ScrollArea>
    </div>
  );
};
