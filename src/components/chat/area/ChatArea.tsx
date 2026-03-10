// src/components/chat/area/ChatArea.tsx
import { useState, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import ChatHeader from "@/components/chat/misc/ChatHeader";
import ChatInput from "@/components/chat/input/ChatInput";
import LunexLogo from "@/components/shared/LunexLogo";
import PendingUploadsList from "@/components/chat/media/PendingUploadsList";
import { useChatData } from "@/hooks/useChatData";
import { useDecryptMessages } from "@/hooks/useDecryptMessages";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatTheme } from "@/hooks/useChatTheme";
import { useMessageSelection } from "@/hooks/useMessageSelection";
import ChatAreaPinnedBar from "@/components/chat/area/ChatAreaPinnedBar";
import ChatAreaDeleteDialog from "@/components/chat/area/ChatAreaDeleteDialog";
import ChatAreaContextMenu from "@/components/chat/area/ChatAreaContextMenu";
import MessageList from "@/components/chat/area/MessageList";

export default function ChatArea() {
  const {
    activeChat,
    clearActiveChat,
    updateLastMessageCache,
    updateReadByCache,
    updateDeliveredToCache,
    pendingUploads,
    jumpToMessageId,
    setJumpToMessageId,
    scrollToBottomTrigger,
  } = useChatStore();

  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [gridMenuOpen, setGridMenuOpen] = useState<string | null>(null);
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
  const [pendingPreviewIndex, setPendingPreviewIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setGridMenuOpen(null);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const {
    conversationData,
    rawMessages,
    otherUser,
    isTyping,
    deleteMessageForMe,
    deleteMessageForEveryone,
  } = useChatData({ activeChat, userId });

  const currentPending = activeChat?.conversationId
    ? pendingUploads[activeChat.conversationId] || []
    : [];

  useEffect(() => {
    if (pendingPreviewIndex !== null) {
      if (currentPending.length === 0) {
        setPendingPreviewIndex(null);
      } else if (pendingPreviewIndex >= currentPending.length) {
        setPendingPreviewIndex(currentPending.length - 1);
      }
    }
  }, [currentPending.length, pendingPreviewIndex]);

  const { decryptedMessages } = useDecryptMessages({
    rawMessages,
    secretKey,
    otherUserPublicKey: otherUser?.publicKey,
    conversationId: activeChat?.conversationId ?? undefined,
    updateLastMessageCache,
    updateReadByCache,
    updateDeliveredToCache,
  });

  const {
    selectedMessages,
    setSelectedMessages,
    selectMode,
    setSelectMode,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    toggleSelectMessage,
    exitSelectMode,
    selectedArray,
    canDeleteForEveryone,
    handleBulkDeleteForMe,
    handleBulkDeleteForEveryone,
  } = useMessageSelection({
    decryptedMessages,
    userId,
    deleteMessageForMe,
    deleteMessageForEveryone,
  });

  const { messagesEndRef } = useChatScroll({
    decryptedMessagesLength: decryptedMessages.length,
    currentPendingLength: currentPending.length,
    jumpToMessageId,
    setJumpToMessageId,
    scrollToBottomTrigger,
    isTyping,
  });

  if (!activeChat) return null;

  const { themeClass, customThemeStyles, isLoading, pendingNamesStr } =
    useChatTheme({
      activeChat,
      rawMessages,
      currentPending,
    });

  const TypingBubble = () => (
    <div className="flex justify-start mb-1 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-10">
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s] opacity-70" />
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s] opacity-70" />
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-70" />
      </div>
    </div>
  );

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 bg-background transition-colors duration-300 relative z-60 ${themeClass}`}
      style={customThemeStyles}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ChatHeader />

      <ChatAreaPinnedBar
        pinnedMessages={conversationData?.pinnedMessages ?? []}
        currentPinnedIndex={currentPinnedIndex}
        decryptedMessages={decryptedMessages}
        onPinClick={() => {
          const pinnedIds = conversationData!.pinnedMessages!;
          const targetId = pinnedIds[currentPinnedIndex % pinnedIds.length];
          setJumpToMessageId(targetId);
          if (pinnedIds.length > 1) {
            setCurrentPinnedIndex((prev) => (prev + 1) % pinnedIds.length);
          }
        }}
      />

      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 relative z-50"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const menuWidth = 192;
          const menuHeight = 100;
          const x =
            e.clientX + menuWidth > window.innerWidth
              ? window.innerWidth - menuWidth - 8
              : e.clientX;
          const y =
            e.clientY + menuHeight > window.innerHeight
              ? window.innerHeight - menuHeight - 8
              : e.clientY;
          setContextMenu({ x, y });
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : decryptedMessages.length === 0 && currentPending.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 opacity-90 animate-in fade-in duration-500">
            <LunexLogo className="w-24 h-24 rounded-full shadow-lg border-2 border-primary/20" />
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-foreground tracking-tight">
                Nothing here yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-62.5 mx-auto leading-relaxed">
                Send a message or media to start the conversation with{" "}
                <span className="font-semibold text-foreground">
                  {activeChat?.username}
                </span>
                .
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            decryptedMessages={decryptedMessages}
            pendingNamesStr={pendingNamesStr}
            selectMode={selectMode}
            selectedMessages={selectedMessages}
            gridMenuOpen={gridMenuOpen}
            secretKey={secretKey}
            otherUser={otherUser}
            activeChat={activeChat}
            pinnedMessages={conversationData?.pinnedMessages ?? []}
            toggleSelectMessage={toggleSelectMessage}
            setSelectMode={setSelectMode}
            setGridMenuOpen={setGridMenuOpen}
            onDeleteClick={(ids) => {
              setSelectedMessages(new Set(ids));
              setIsDeleteDialogOpen(true);
            }}
          />
        )}

        {isTyping && <TypingBubble />}

        <PendingUploadsList
          currentPending={currentPending}
          activeChatId={activeChat.conversationId!}
        />

        <div ref={messagesEndRef} className="h-1" />
      </div>

      <div className="relative z-70 shrink-0">
        <ChatInput
          selectMode={selectMode}
          selectedCount={selectedMessages.size}
          onCancelSelect={exitSelectMode}
          onDeleteSelected={() => setIsDeleteDialogOpen(true)}
        />
      </div>

      <ChatAreaDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        selectedCount={selectedArray.length}
        canDeleteForEveryone={canDeleteForEveryone}
        onDeleteForMe={handleBulkDeleteForMe}
        onDeleteForEveryone={handleBulkDeleteForEveryone}
      />

      <ChatAreaContextMenu
        contextMenu={contextMenu}
        onSelectMessages={() => {
          setSelectMode(true);
          setContextMenu(null);
        }}
        onCloseChat={() => {
          clearActiveChat();
          setContextMenu(null);
        }}
      />
    </div>
  );
}
