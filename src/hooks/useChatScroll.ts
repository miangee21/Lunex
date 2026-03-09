//src/hooks/useChatScroll.ts
import { useEffect, useRef } from "react";

type Deps = {
  decryptedMessagesLength: number;
  currentPendingLength: number;
  jumpToMessageId: string | null;
  setJumpToMessageId: (id: string | null) => void;
  scrollToBottomTrigger: number;
  isTyping: boolean | undefined;
};

export function useChatScroll({
  decryptedMessagesLength,
  currentPendingLength,
  jumpToMessageId,
  setJumpToMessageId,
  scrollToBottomTrigger,
  isTyping,
}: Deps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const prevScrollTrigger = useRef(scrollToBottomTrigger);

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

  return { messagesEndRef };
}
