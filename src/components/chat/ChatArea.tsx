//src/components/chat/ChatArea.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/ChatBubble";
import { CheckSquare, X } from "lucide-react";
import { decryptMessage } from "@/crypto/encryption";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { base64ToKey } from "@/crypto/keyDerivation";
import MediaGridGroup from "@/components/chat/MediaGridGroup";
import PendingUploadsList from "@/components/chat/PendingUploadsList";
import LunexLogo from "@/components/shared/LunexLogo";

export type DecryptedMessage = {
  id: string;
  text: string;
  time: string;
  timestamp: number;
  isOwn: boolean;
  senderId: string;
  type: "text" | "image" | "video" | "file";
  mediaStorageId: string | null;
  mediaIv: string | null;
  mediaOriginalName: string | null;
  reactions: Array<{ userId: string; emoji: string }>;
  editedAt: number | null;
  readBy: { userId: string; time: number }[];
  deliveredTo: { userId: string; time: number }[];
  replyToMessageId: string | null;
};

export default function ChatArea() {
  const {
    activeChat,
    clearActiveChat,
    syncChatTheme,
    updateLastMessageCache,
    updateReadByCache,
    updateDeliveredToCache,
    pendingUploads,
    jumpToMessageId,
    setJumpToMessageId,
    markReactionAsSeen, 
    scrollToBottomTrigger, // ── FIX: Store se state nikala ──
  } = useChatStore();

  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [gridMenuOpen, setGridMenuOpen] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [selectMode, setSelectMode] = useState(false);

  const [pendingPreviewIndex, setPendingPreviewIndex] = useState<number | null>(
    null,
  );

  function toggleSelectMessage(id: string) {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedMessages(new Set());
  }

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setGridMenuOpen(null);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const cloudTheme = useQuery(
    api.chatThemes.getChatTheme,
    userId && activeChat?.userId
      ? {
          userId: userId as Id<"users">,
          otherUserId: activeChat.userId as Id<"users">,
        }
      : "skip",
  );

  useEffect(() => {
    if (userId && activeChat?.userId && cloudTheme !== undefined) {
      const themeData = cloudTheme
        ? {
            chatPresetName: cloudTheme.chatPresetName,
            chatBgColor: cloudTheme.chatBgColor,
            myBubbleColor: cloudTheme.myBubbleColor,
            otherBubbleColor: cloudTheme.otherBubbleColor,
            myTextColor: cloudTheme.myTextColor,
            otherTextColor: cloudTheme.otherTextColor,
          }
        : {
            chatPresetName: undefined,
            chatBgColor: undefined,
            myBubbleColor: undefined,
            otherBubbleColor: undefined,
            myTextColor: undefined,
            otherTextColor: undefined,
          };
      syncChatTheme(userId, activeChat.userId, themeData);
    }
  }, [cloudTheme, userId, activeChat?.userId, syncChatTheme]);

  const rawMessages = useQuery(
    api.messages.getMessages,
    activeChat?.conversationId && userId
      ? {
          conversationId: activeChat.conversationId as Id<"conversations">,
          userId: userId as Id<"users">,
        }
      : "skip",
  );

  const markAsRead = useMutation(api.messages.markMessagesAsRead);
  const markAsDelivered = useMutation(api.messages.markAsDelivered);
  
  // ── FIX: Delete Mutations & Modal State ──
  const deleteMessageForMe = useMutation(api.messages.deleteMessageForMe);
  const deleteMessageForEveryone = useMutation(api.messages.deleteMessageForEveryone);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId ? { userId: activeChat.userId as never } : "skip",
  );

  useEffect(() => {
    if (activeChat?.conversationId && userId) {
      markAsRead({
        conversationId: activeChat.conversationId as Id<"conversations">,
        userId: userId as Id<"users">,
      });
      markAsDelivered({
        conversationId: activeChat.conversationId as Id<"conversations">,
        userId: userId as Id<"users">,
      });
      // ── FIX: Mark reaction as seen so badge disappears ──
      markReactionAsSeen(activeChat.conversationId, Date.now());
    }
  }, [activeChat?.conversationId, rawMessages?.length, markReactionAsSeen]);

  const [decryptedMessages, setDecryptedMessages] = useState<
    DecryptedMessage[]
  >([]);

  useEffect(() => {
    if (!rawMessages || !secretKey) return;

    async function decryptAll() {
      const result = await Promise.all(
        rawMessages!.map(async (msg) => {
          let text = "";
          try {
            if (!otherUser?.publicKey) {
              text = "🔒 Unable to decrypt message";
            } else {
              const theirPublicKey = base64ToKey(otherUser.publicKey);
              text = decryptMessage(
                { encryptedContent: msg.encryptedContent, iv: msg.iv },
                secretKey!,
                theirPublicKey,
              );
            }
          } catch {
            text = "🔒 Unable to decrypt message";
          }

         // ── FIX: REACTION DECRYPTION ENGINE ──
          let decryptedReactions: Array<{ userId: string; emoji: string }> = []; // ── FIX: TypeScript ko type bata di ──
          if (msg.reactions && msg.reactions.length > 0) {
            decryptedReactions = msg.reactions.map((r: any) => {
              // Agar purana unencrypted reaction hai toh usay chalne do
              if (r.emoji) return { userId: r.userId, emoji: r.emoji }; 
              try {
                if (!otherUser?.publicKey) return { userId: r.userId, emoji: "🔒" };
                const theirPublicKey = base64ToKey(otherUser.publicKey);
                const decEmoji = decryptMessage({ encryptedContent: r.encryptedEmoji, iv: r.iv }, secretKey!, theirPublicKey);
                return { userId: r.userId, emoji: decEmoji };
              } catch {
                return { userId: r.userId, emoji: "🔒" };
              }
            });
          }

          return {
            id: msg.id,
            text,
            time: new Date(msg.sentAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            timestamp: msg.sentAt,
            isOwn: msg.isOwn,
            senderId: msg.senderId,
            type: msg.type as "text" | "image" | "video" | "file",
            mediaStorageId: msg.mediaStorageId ?? null,
            mediaIv: msg.mediaIv ?? null,
            mediaOriginalName: msg.mediaOriginalName ?? null,
            reactions: decryptedReactions, // ── FIX: Plain text ki jagah decrypted pass kiye ──
            editedAt: msg.editedAt,
            readBy: msg.readBy,
            deliveredTo: msg.deliveredTo,
            replyToMessageId: msg.replyToMessageId ?? null,
          };
        }),
      );

      setDecryptedMessages(result);

      if (result.length > 0 && activeChat?.conversationId) {
        const last = result[result.length - 1];
        const lastRaw = rawMessages![rawMessages!.length - 1];
        updateLastMessageCache(activeChat.conversationId, {
          text: last.text,
          senderId: last.senderId,
          sentAt: lastRaw.sentAt,
          type: lastRaw.type,
        });
        updateReadByCache(activeChat.conversationId, lastRaw.readBy ?? []);
        updateDeliveredToCache(
          activeChat.conversationId,
          lastRaw.deliveredTo ?? [],
        );
      }
    }

    decryptAll();
  }, [rawMessages, secretKey, otherUser?.publicKey]);

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

 // ── FIX: PERFECT AUTO-SCROLL ENGINE ──
  const prevMsgCount = useRef(0);
  const prevScrollTrigger = useRef(scrollToBottomTrigger); // ── FIX: Trigger memory ──

  useEffect(() => {
    // SCENARIO 1: Jump karna ha (Sidebar se click)
    if (jumpToMessageId && decryptedMessages.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`message-${jumpToMessageId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-primary", "bg-primary/20", "scale-[1.02]");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "bg-primary/20", "scale-[1.02]");
          }, 1200);
          setJumpToMessageId(null);
        }
      }, 300);
      prevMsgCount.current = decryptedMessages.length;
      return; 
    } 
    
    // SCENARIO 2: Normal Scrolling
    if (!jumpToMessageId) {
      const isManualTrigger = scrollToBottomTrigger !== prevScrollTrigger.current; // ── FIX: Pata lagaya k user ne click kia ha ──
      
      // Agar naya message aya HA YA user ne chatsidebar pe click kia ha, tu bottom pe le jao
      if (decryptedMessages.length > prevMsgCount.current || currentPending.length > 0 || isManualTrigger) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    
    prevMsgCount.current = decryptedMessages.length;
    prevScrollTrigger.current = scrollToBottomTrigger; // ── FIX: Memory update ──
  }, [decryptedMessages.length, currentPending.length, jumpToMessageId, setJumpToMessageId, scrollToBottomTrigger]); // ── FIX: Dependency add ki ── 

  if (!activeChat) return null;

  const themeClass = activeChat.chatPresetName
    ? `theme-${activeChat.chatPresetName.toLowerCase()}`
    : "";
  const customThemeStyles = {
    ...(activeChat.chatBgColor && {
      "--background": activeChat.chatBgColor,
      "--sidebar": activeChat.chatBgColor,
    }),
    ...(activeChat.myBubbleColor && { "--primary": activeChat.myBubbleColor }),
    ...(activeChat.otherBubbleColor && {
      "--secondary": activeChat.otherBubbleColor,
    }),
    ...(activeChat.myTextColor && {
      "--primary-foreground": activeChat.myTextColor,
    }),
    ...(activeChat.otherTextColor && {
      "--secondary-foreground": activeChat.otherTextColor,
    }),
  } as React.CSSProperties;

  const isLoading = activeChat.conversationId && rawMessages === undefined;

  const pendingNamesStr = currentPending
    .map((p) => p.file.name)
    .sort()
    .join("|");
  const memoizedMessages = useMemo(() => {
    const pendingNames = new Set(pendingNamesStr.split("|").filter(Boolean));
    const now = Date.now();

    const visibleMessages = decryptedMessages.filter((msg) => {
      if (
        msg.isOwn &&
        pendingNames.size > 0 &&
        msg.mediaOriginalName &&
        pendingNames.has(msg.mediaOriginalName)
      ) {
        if (now - msg.timestamp < 60000) return false;
      }
      return true;
    });

    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < visibleMessages.length) {
      const msg = visibleMessages[i];

      if (msg.type !== "text" && !selectMode) {
        const group: typeof visibleMessages = [];
        let j = i;
        while (
          j < visibleMessages.length &&
          visibleMessages[j].type !== "text" &&
          visibleMessages[j].senderId === msg.senderId
        ) {
          group.push(visibleMessages[j]);
          j++;
        }

        if (group.length > 1) {
          const displayGroup = group.slice(0, 4);
          const extraCount = group.length > 4 ? group.length - 4 : 0;

          elements.push(
            <MediaGridGroup
              key={`wrap-${msg.id}`}
              displayGroup={displayGroup}
              group={group}
              extraCount={extraCount}
              secretKey={secretKey}
              otherUser={otherUser}
              activeChat={activeChat}
              isGroupOwn={msg.isOwn}
              setGridMenuOpen={setGridMenuOpen}
              gridMenuOpen={gridMenuOpen}
              toggleSelectMessage={toggleSelectMessage}
              selectMode={selectMode}
              setSelectMode={setSelectMode}
              selectedMessages={selectedMessages}
            />,
          );
          i = j;
          continue;
        }
      }

      elements.push(
        <div
          key={msg.id}
          onClick={() => selectMode && toggleSelectMessage(msg.id)}
          className={selectMode ? "cursor-pointer" : ""}
        >
          {selectMode && (
            <div
              className={`flex ${msg.isOwn ? "justify-end" : "justify-start"} mb-1`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMessages.has(msg.id) ? "bg-primary border-primary" : "border-muted-foreground"}`}
              >
                {selectedMessages.has(msg.id) && (
                  <svg
                    className="w-3 h-3 text-primary-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
          )}
          <MessageBubble
            messageId={msg.id}
            text={msg.text}
            time={msg.time}
            isOwn={msg.isOwn}
            type={msg.type}
            mediaStorageId={msg.mediaStorageId}
            mediaIv={msg.mediaIv}
            mediaOriginalName={msg.mediaOriginalName}
            reactions={msg.reactions}
            editedAt={msg.editedAt}
            readBy={msg.readBy}
            deliveredTo={msg.deliveredTo}
            otherUserId={activeChat?.userId}
            // ── FIX: ACTUAL TIMESTAMP AUR QUOTED BUBBLE DATA ──
            sentAt={msg.timestamp} 
            secretKey={secretKey} // ── FIX: Keys pass ki encryption k lea ──
            otherUserPublicKey={otherUser?.publicKey}
            replyToMessage={(() => {
              if (!msg.replyToMessageId) return null;
              // Message list mein original message dhoondo
              const originalMsg = decryptedMessages.find(m => m.id === msg.replyToMessageId);
              if (!originalMsg) return null;
              
              // Sender name nikalo (Agar apna hai toh "You", warna doosre ka username)
              const senderName = originalMsg.isOwn ? "You" : (activeChat?.username || "User");
              
              return {
                id: originalMsg.id, // ── FIX: Scroll karne k lea ID pass ki ──
                text: originalMsg.text,
                senderName,
                type: originalMsg.type,
              };
            })()}
            onSelect={() => {
              setSelectMode(true);
              toggleSelectMessage(msg.id);
            }}
          />
        </div>,
      );
      i++;
    }
    return elements;
  }, [
    decryptedMessages,
    pendingNamesStr,
    selectMode,
    selectedMessages,
    gridMenuOpen,
    secretKey,
    otherUser,
    activeChat,
  ]);

  // ── FIX: Delete Logic (1 Hour Check & Ownership) ──
  const selectedArray = Array.from(selectedMessages);
  let canDeleteForEveryone = false;

  if (selectedArray.length === 1) {
    const msgToDel = decryptedMessages.find((m) => m.id === selectedArray[0]);
    const ONE_HOUR = 60 * 60 * 1000;
    if (msgToDel?.isOwn && Date.now() - msgToDel.timestamp < ONE_HOUR) {
      canDeleteForEveryone = true;
    }
  }

  const handleBulkDeleteForMe = async () => {
    if (!userId) return;
    try {
      await Promise.all(
        selectedArray.map((msgId) =>
          deleteMessageForMe({ messageId: msgId as Id<"messages">, userId: userId as Id<"users"> })
        )
      );
      toast.success("Messages deleted for you");
      setIsDeleteDialogOpen(false);
      exitSelectMode();
    } catch {
      toast.error("Failed to delete messages");
    }
  };

  const handleBulkDeleteForEveryone = async () => {
    if (!userId || selectedArray.length !== 1) return;
    try {
      await deleteMessageForEveryone({ 
        messageId: selectedArray[0] as Id<"messages">, 
        userId: userId as Id<"users"> 
      });
      toast.success("Message deleted for everyone");
      setIsDeleteDialogOpen(false);
      exitSelectMode();
    } catch {
      toast.error("Failed to delete message");
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 bg-background transition-colors duration-300 relative ${themeClass}`}
      style={customThemeStyles}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ChatHeader />

      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
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
          memoizedMessages
        )}

        <PendingUploadsList
          currentPending={currentPending}
          activeChatId={activeChat.conversationId!}
        />

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        selectMode={selectMode}
        selectedCount={selectedMessages.size}
        onCancelSelect={exitSelectMode}
        onDeleteSelected={() => setIsDeleteDialogOpen(true)}
      />

      {/* ── PROFESSIONAL DELETE MODAL (SELECT MODE) ── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl shadow-xl border-border sm:max-w-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-bold">
              {selectedArray.length > 1 ? `Delete ${selectedArray.length} messages?` : "Delete message?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-[15px] leading-relaxed">
              {canDeleteForEveryone 
                ? "You can delete this message for everyone or just for yourself." 
                : selectedArray.length > 1 
                  ? "Are you sure you want to delete these messages for yourself? This cannot be undone."
                  : "Are you sure you want to delete this message for yourself? This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <button 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent border border-transparent hover:border-border transition-colors w-full sm:w-auto text-foreground"
            >
              Cancel
            </button>
            <button 
              onClick={handleBulkDeleteForMe}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-transparent hover:bg-accent transition-colors w-full sm:w-auto text-foreground"
            >
              Delete for me
            </button>
            {canDeleteForEveryone && (
              <button 
                onClick={handleBulkDeleteForEveryone}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors w-full sm:w-auto"
              >
                Delete for everyone
              </button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {contextMenu && (
        <div
          className="fixed z-50 w-48 bg-card border border-border shadow-xl rounded-xl overflow-hidden animate-in fade-in-80 zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSelectMode(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <CheckSquare size={14} className="text-muted-foreground" /> Select
            messages
          </button>
          <div className="h-px bg-border w-full" />
          <button
            onClick={() => {
              clearActiveChat();
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <X size={14} /> Close chat
          </button>
        </div>
      )}
    </div>
  );
}
