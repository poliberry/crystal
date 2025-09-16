"use client";

import type { Member } from "@prisma/client";
import dayjs from "dayjs";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Loader2, ServerCrash } from "lucide-react";
import { type ElementRef, Fragment, useRef } from "react";

import { useChatQuery } from "@/hooks/use-chat-query";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useSocket } from "@/components/providers/socket-provider";
import { useNotifications } from "@/hooks/use-notifications";
import type { MessageWithMemberWithProfile, DirectMessageWithProfile } from "@/types";

import { ChatItem } from "./chat-item";
import { ChatWelcome } from "./chat-welcome";

const DATE_FORMAT = "D MMM YYYY, HH:mm";

type ChatMessagesProps = {
  name: string;
  member: Member;
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
  const queryKey = `chat:${chatId}`;
  const addKey = `chat:${chatId}:messages`;
  const updateKey = `chat:${chatId}:messages:update`;
  const { socket } = useSocket();
  const { markChannelAsRead, markConversationAsRead } = useNotifications();

  const chatRef = useRef<ElementRef<"div">>(null);
  const bottomRef = useRef<ElementRef<"div">>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useChatQuery({
      queryKey,
      apiUrl,
      paramKey,
      paramValue,
    });

  useChatSocket({ queryKey, addKey, updateKey });
  
  // Determine if this is a channel or conversation
  const isChannel = type === "channel";
  const channelId = isChannel ? chatId : undefined;
  const conversationId = !isChannel ? chatId : undefined;

  useChatScroll({
    chatRef,
    bottomRef,
    loadMore: fetchNextPage,
    shouldLoadMore: !isFetchingNextPage && !!hasNextPage,
    count: data?.pages?.[0]?.items?.length ?? 0,
    channelId,
    conversationId,
    onScrollToBottom: () => {
      // Additional callback for when user scrolls to bottom
      if (isChannel && channelId) {
        markChannelAsRead(channelId);
      } else if (conversationId) {
        markConversationAsRead(conversationId);
      }
    },
  });

  if (status === "loading") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading messages...
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Something went wrong!
        </p>
      </div>
    );
  }

  return (
    <div ref={chatRef} className="flex-1 flex flex-col py-4 max-h-[89vh] overflow-y-auto">
      {!hasNextPage && <div className="flex-1" aria-hidden />}

      {!hasNextPage && <ChatWelcome type={type} name={name} />}

      {hasNextPage && (
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          layout="position"
        >
          {isFetchingNextPage ? (
            <Loader2 className="h-6 w-6 text-zinc-500 animate-spin my-4" />
          ) : (
            <motion.button
              onClick={() => fetchNextPage()}
              className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 text-sm my-4 dark:hover-text-zinc-300 transition"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "tween", duration: 0.1 }}
            >
              Load previous messages
            </motion.button>
          )}
        </motion.div>
      )}

      <LayoutGroup>
        <motion.div 
          className="flex flex-col-reverse mt-auto"
          layout="position"
          transition={{
            layout: {
              type: "tween",
              duration: 0.2,
              ease: "easeOut"
            }
          }}
        >
          <AnimatePresence initial={false} mode="sync">
            {data?.pages?.map((group, i) => {
              if (!group?.items) return null;
              
              return (
                <Fragment key={i}>
                  {group.items.map((message: MessageWithMemberWithProfile, messageIndex: number) => (
                    <motion.div
                      key={message.id}
                      layoutId={`message-${message.id}`}
                      initial={{ 
                        opacity: 0, 
                        y: 20,
                        scale: 0.98
                      }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: 1
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.95,
                        transition: {
                          duration: 0.15,
                          ease: "easeIn"
                        }
                      }}
                      transition={{
                        type: "tween",
                        duration: 0.3,
                        ease: "easeOut",
                        delay: Math.min(messageIndex * 0.01, 0.1) // Minimal stagger, capped at 100ms
                      }}
                      layout="position"
                      style={{ willChange: "transform, opacity" }}
                    >
                      <ChatItem
                        currentMember={member}
                        member={message.member}
                        profile={(message as any).profile}
                        id={message.id}
                        content={message.content}
                        attachments={message.attachments}
                        deleted={message.deleted}
                        timestamp={dayjs(message.createdAt).format(DATE_FORMAT)}
                        isUpdated={message.updatedAt !== message.createdAt}
                        socketUrl={socketUrl}
                        socketQuery={socketQuery}
                      />
                    </motion.div>
                  ))}
                </Fragment>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      <div ref={bottomRef} aria-hidden />
    </div>
  );
};
