import { useEffect, useState } from "react";

type ChatScrollProps = {
  chatRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  shouldLoadMore: boolean;
  loadMore: () => void;
  count: number;
  channelId?: string;
  conversationId?: string;
  onScrollToBottom?: () => void;
};

export const useChatScroll = ({
  chatRef,
  bottomRef,
  shouldLoadMore,
  loadMore,
  count,
  channelId,
  conversationId,
  onScrollToBottom,
}: ChatScrollProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const topDiv = chatRef?.current;

    const handleScroll = () => {
      const scrollTop = topDiv?.scrollTop;

      if (scrollTop === 0 && shouldLoadMore) {
        loadMore();
        return;
      }

      // Check if user scrolled to bottom
      if (topDiv) {
        const distanceFromBottom =
          topDiv.scrollHeight - topDiv.scrollTop - topDiv.clientHeight;
        const atBottom = distanceFromBottom <= 10; // 10px threshold
        
        if (atBottom && !isAtBottom) {
          setIsAtBottom(true);
          // Call API route for marking as read
          if (channelId) {
            fetch("/api/socket/channel-scroll", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ channelId }),
            }).catch(console.error);
          } else if (conversationId) {
            fetch("/api/socket/conversation-scroll", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ conversationId }),
            }).catch(console.error);
          }
          // Call callback if provided
          onScrollToBottom?.();
        } else if (!atBottom && isAtBottom) {
          setIsAtBottom(false);
        }
      }
    };

    topDiv?.addEventListener("scroll", handleScroll);

    return () => topDiv?.removeEventListener("scroll", handleScroll);
  }, [shouldLoadMore, loadMore, chatRef, isAtBottom, channelId, conversationId, onScrollToBottom]);

  useEffect(() => {
    const bottomDiv = bottomRef?.current;
    const topDiv = chatRef.current;

    const shouldAutoScroll = () => {
      if (!hasInitialized && bottomDiv) {
        setHasInitialized(true);
        return true;
      }

      if (!topDiv) return false;

      const distanceFromBottom =
        topDiv?.scrollHeight - topDiv?.scrollTop - topDiv?.clientHeight;

      return distanceFromBottom <= 100;
    };

    if (shouldAutoScroll()) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    }
  }, [bottomRef, chatRef, count, hasInitialized]);
};
