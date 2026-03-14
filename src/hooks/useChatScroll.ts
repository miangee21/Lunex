//src/hooks/useChatScroll.ts
import { useEffect, useRef, useCallback } from "react";

type Deps = {
  decryptedMessagesLength: number;
  currentPendingLength: number;
  jumpToMessageId: string | null;
  setJumpToMessageId: (id: string | null) => void;
  scrollToBottomTrigger: number;
  isTyping: boolean | undefined;
  onScrollToTop?: () => void;
  isLoadingMore?: boolean;
};

export function useChatScroll({
  decryptedMessagesLength,
  currentPendingLength,
  jumpToMessageId,
  setJumpToMessageId,
  scrollToBottomTrigger,
  isTyping,
  onScrollToTop,
  isLoadingMore,
}: Deps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const prevScrollTrigger = useRef(scrollToBottomTrigger);
  const previousScrollData = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  // Scroll to bottom on first load
  useEffect(() => {
    if (decryptedMessagesLength > 0 && prevMsgCount.current === 0) {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
      prevMsgCount.current = decryptedMessagesLength;
    }
  }, [decryptedMessagesLength]);

  useEffect(() => {
    if (jumpToMessageId && decryptedMessagesLength > 0) {
      setTimeout(() => {
        const element = document.getElementById(`message-${jumpToMessageId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add(
            "ring-2",
            "ring-primary",
            "bg-primary/20",
            "scale-[1.02]",
          );
          setTimeout(() => {
            element.classList.remove(
              "ring-2",
              "ring-primary",
              "bg-primary/20",
              "scale-[1.02]",
            );
          }, 1200);
        }
        setJumpToMessageId(null);
      }, 400);
      prevMsgCount.current = decryptedMessagesLength;
      return;
    }

    if (!jumpToMessageId) {
      const isManualTrigger =
        scrollToBottomTrigger !== prevScrollTrigger.current;
      if (
        decryptedMessagesLength > prevMsgCount.current ||
        currentPendingLength > 0 ||
        isManualTrigger ||
        isTyping
      ) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }

    prevMsgCount.current = decryptedMessagesLength;
    prevScrollTrigger.current = scrollToBottomTrigger;
  }, [
    decryptedMessagesLength,
    currentPendingLength,
    jumpToMessageId,
    setJumpToMessageId,
    scrollToBottomTrigger,
    isTyping,
  ]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || isLoadingMore) return;
    if (el.scrollTop < 80) {
      previousScrollData.current = {
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
      };
      onScrollToTop?.();
    }
  }, [onScrollToTop, isLoadingMore]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!isLoadingMore && previousScrollData.current) {
      const el = scrollContainerRef.current;
      if (!el) return;
      const { scrollHeight, scrollTop } = previousScrollData.current;
      const heightDiff = el.scrollHeight - scrollHeight;
      el.scrollTop = scrollTop + heightDiff;
      previousScrollData.current = null;
    }
  }, [decryptedMessagesLength, isLoadingMore]);

  return { messagesEndRef, scrollContainerRef };
}
