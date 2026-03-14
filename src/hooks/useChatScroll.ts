//src/hooks/useChatScroll.ts
import { useEffect, useLayoutEffect, useRef, useCallback } from "react";

type Deps = {
  conversationId?: string;
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
  conversationId,
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
  const prevPendingCount = useRef(0);
  const prevScrollTrigger = useRef(scrollToBottomTrigger);
  const previousScrollData = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);

  const isFirstLoad = useRef(true);
  const allowPagination = useRef(false);

  const isUserAtBottom = useRef(true);

  useLayoutEffect(() => {
    isFirstLoad.current = true;
    allowPagination.current = false;
    previousScrollData.current = null;
    prevMsgCount.current = 0;
    prevPendingCount.current = 0;
    isUserAtBottom.current = true;
  }, [conversationId]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (!isLoadingMore && previousScrollData.current) {
      const { scrollHeight, scrollTop } = previousScrollData.current;
      el.style.scrollBehavior = "auto";
      el.scrollTop = scrollTop + (el.scrollHeight - scrollHeight);
      el.style.scrollBehavior = "";
      previousScrollData.current = null;
    }

    if (
      decryptedMessagesLength > 0 &&
      isFirstLoad.current &&
      !jumpToMessageId
    ) {
      isFirstLoad.current = false;

      el.style.scrollBehavior = "auto";
      el.scrollTop = el.scrollHeight;

      const lockInterval = setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        }
      }, 10);

      setTimeout(() => {
        clearInterval(lockInterval);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        }
        el.style.scrollBehavior = "";
        allowPagination.current = true;
      }, 300);

      prevMsgCount.current = decryptedMessagesLength;
      prevPendingCount.current = currentPendingLength;
      prevScrollTrigger.current = scrollToBottomTrigger;
    }
  }, [
    decryptedMessagesLength,
    isLoadingMore,
    jumpToMessageId,
    scrollToBottomTrigger,
  ]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      if (
        !isFirstLoad.current &&
        allowPagination.current &&
        isUserAtBottom.current
      ) {
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      }
    });

    let mutationTimeout: ReturnType<typeof setTimeout>;
    const mutationObserver = new MutationObserver(() => {
      if (
        !isFirstLoad.current &&
        allowPagination.current &&
        isUserAtBottom.current
      ) {
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }, 50);
      }
    });

    resizeObserver.observe(el);
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      clearTimeout(mutationTimeout);
    };
  }, []);

  useEffect(() => {
    if (isFirstLoad.current || jumpToMessageId || decryptedMessagesLength === 0)
      return;

    const totalCurrentBubbles = decryptedMessagesLength + currentPendingLength;
    const totalPrevBubbles = prevMsgCount.current + prevPendingCount.current;

    const isManualTrigger = scrollToBottomTrigger !== prevScrollTrigger.current;
    const diff = totalCurrentBubbles - totalPrevBubbles;

    const isNewLiveMessage = diff > 0 && diff < 20;

    if (isNewLiveMessage || isManualTrigger || isTyping) {
      isUserAtBottom.current = true;

      const forceScroll = () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      };

      forceScroll();
      setTimeout(forceScroll, 150);
    }

    prevMsgCount.current = decryptedMessagesLength;
    prevPendingCount.current = currentPendingLength;
    prevScrollTrigger.current = scrollToBottomTrigger;
  }, [
    decryptedMessagesLength,
    currentPendingLength,
    jumpToMessageId,
    scrollToBottomTrigger,
    isTyping,
  ]);

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
    }
  }, [jumpToMessageId, decryptedMessagesLength, setJumpToMessageId]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || isLoadingMore || !allowPagination.current) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserAtBottom.current = distanceToBottom < 100;

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

  return { messagesEndRef, scrollContainerRef };
}
