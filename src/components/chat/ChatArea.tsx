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
import { CheckSquare, X, Pin } from "lucide-react"; // ── FIX: Added Pin for Pinned Bar ──
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
  type: "text" | "image" | "video" | "file" | "system";
  mediaStorageId: string | null;
  mediaIv: string | null;
  mediaOriginalName: string | null;
  mediaDeletedAt: number | null;
  uploadBatchId: string | null;
  reactions: Array<{ userId: string; emoji: string }>;
  editedAt: number | null;
  disappearsAt: number | null;
  readBy: { userId: string; time: number }[];
  deliveredTo: { userId: string; time: number }[];
  replyToMessageId: string | null;
  isStarred?: boolean; // ── FIX: Added isStarred ──
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
    scrollToBottomTrigger, 
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
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0); // ── FIX: State for cycling Pinned Messages ──

  const [pendingPreviewIndex, setPendingPreviewIndex] = useState<number | null>(
    null,
  );

  function toggleSelectMessage(id: string) {
    const msg = decryptedMessages.find(m => m.id === id);
    if (!msg) return;

    setSelectedMessages((prev) => {
      const next = new Set(prev);
      const isAlreadySelected = next.has(id);

      if (msg.uploadBatchId) {
        const batchMsgs = decryptedMessages.filter(m => m.uploadBatchId === msg.uploadBatchId);
        batchMsgs.forEach(bm => {
          if (isAlreadySelected) next.delete(bm.id);
          else next.add(bm.id);
        });
      } else {
        if (isAlreadySelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedMessages(new Set());
  }
  useEffect(() => {
    const handleSingleDelete = (e: any) => {
      setSelectedMessages(new Set([e.detail.id]));
      setIsDeleteDialogOpen(true);
    };
    window.addEventListener("open-delete-modal-for-single", handleSingleDelete);
    return () => window.removeEventListener("open-delete-modal-for-single", handleSingleDelete);
  }, []);

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

  // ── Conversation disappearing info fetch karo ──
  const conversationData = useQuery(
    api.conversations.getConversationById,
    activeChat?.conversationId
      ? { conversationId: activeChat.conversationId as Id<"conversations"> }
      : "skip",
  );

  const { syncDisappearing } = useChatStore();

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
  
  const deleteMessageForMe = useMutation(api.messages.deleteMessageForMe);
  const deleteMessageForEveryone = useMutation(api.messages.deleteMessageForEveryone);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId && userId ? { userId: activeChat.userId as Id<"users">, viewerId: userId as Id<"users"> } : "skip",
  );

  const currentUser = useQuery(
 api.users.getUserById,
 userId ? { userId: userId as Id<"users">, viewerId: userId as Id<"users"> } : "skip",
 );

 // ── PRO FIX: Effect ko yahan lagana hai taake variables pehle load ho chuke hon ──
 useEffect(() => {
  if (conversationData !== undefined && currentUser !== undefined && otherUser !== undefined) {
 let effectiveMode = false;
 let effectiveTimer: string | undefined = undefined;
 let effectiveSetBy: string | undefined = undefined;

 if (conversationData?.disappearingMode && conversationData?.disappearingTimer) {
  effectiveMode = true;
  effectiveTimer = conversationData.disappearingTimer;
  effectiveSetBy = conversationData.disappearingSetBy;
 } else if (currentUser?.settingDisappearing) {
 effectiveMode = true;
 effectiveTimer = currentUser.settingDisappearing;
  effectiveSetBy = userId as string;
 } else if (otherUser?.settingDisappearing) {
  effectiveMode = true;
  effectiveTimer = otherUser.settingDisappearing;
  effectiveSetBy = otherUser._id;
 }

 syncDisappearing(effectiveMode, effectiveTimer as any, effectiveSetBy);
 }
 }, [conversationData, currentUser, otherUser, syncDisappearing, userId]);

 // ── FIX: Typing Indicator Query ──
  const typingUsers = useQuery(
    api.typing.getTypingUsers,
    activeChat?.conversationId && userId
      ? {
          conversationId: activeChat.conversationId as Id<"conversations">,
          currentUserId: userId as Id<"users">,
        }
      : "skip"
  );
  const isTyping = typingUsers && typingUsers.length > 0;

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
            // ── System messages encrypted nahi hote ──
            if (msg.type === "system") {
              text = msg.encryptedContent;
            } else if (!otherUser?.publicKey) {
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

          let decryptedReactions: Array<{ userId: string; emoji: string }> = []; 
          if (msg.reactions && msg.reactions.length > 0) {
            decryptedReactions = msg.reactions.map((r: any) => {
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
            type: msg.type as "text" | "image" | "video" | "file" | "system",
            mediaStorageId: msg.mediaStorageId ?? null,
            mediaIv: msg.mediaIv ?? null,
            mediaOriginalName: msg.mediaOriginalName ?? null,
            mediaDeletedAt: msg.mediaDeletedAt ?? null,
            uploadBatchId: msg.uploadBatchId ?? null,
            reactions: decryptedReactions,
            editedAt: msg.editedAt,
            disappearsAt: msg.disappearsAt ?? null,
            readBy: msg.readBy,
            deliveredTo: msg.deliveredTo,
            replyToMessageId: msg.replyToMessageId ?? null,
            isStarred: (msg as any).isStarred, // ── FIX: Pass isStarred from backend ──
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

  // ── Client side disappearing & media cleanup ──
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDecryptedMessages((prev) =>
        prev
          .map((m) => {
            // ── FIX 3: Agar media ko theek 6 ghante (21600000 ms) ho gaye hain, tou UI par foran hide kar do ──
            if (m.mediaStorageId && (now - m.timestamp) >= 6 * 60 * 60 * 1000) {
              return { ...m, mediaStorageId: null, mediaDeletedAt: now };
            }
            return m;
          })
          .filter((m) => !m.disappearsAt || m.disappearsAt > now) // Disappearing chat remove
      );
    }, 10000); // har 10 seconds check karo
    return () => clearInterval(interval);
  }, []);

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

  const prevMsgCount = useRef(0);
  const prevScrollTrigger = useRef(scrollToBottomTrigger); 

  useEffect(() => {
    if (jumpToMessageId && decryptedMessages.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`message-${jumpToMessageId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-primary", "bg-primary/20", "scale-[1.02]");
          setTimeout(() => {
             element.classList.remove("ring-2", "ring-primary", "bg-primary/20", "scale-[1.02]");
          }, 1200);
        }
        // ── PRO FIX: Always clear jump ID after delay, whether it's a normal msg or inside a grid ──
        setJumpToMessageId(null);
      }, 400); // Thora time badhaya taake grid ko process karne ka time mil jaye
      prevMsgCount.current = decryptedMessages.length;
      return; 
    }
    
    if (!jumpToMessageId) {
      const isManualTrigger = scrollToBottomTrigger !== prevScrollTrigger.current; 
      if (decryptedMessages.length > prevMsgCount.current || currentPending.length > 0 || isManualTrigger) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    
    prevMsgCount.current = decryptedMessages.length;
    prevScrollTrigger.current = scrollToBottomTrigger; 
  }, [decryptedMessages.length, currentPending.length, jumpToMessageId, setJumpToMessageId, scrollToBottomTrigger]); 

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
    .filter((p) => p.progress < 100)
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

      if (msg.type !== "text" && msg.type !== "system") { 
        const group: typeof visibleMessages = [];
        let j = i;
        while (
          j < visibleMessages.length &&
          visibleMessages[j].type !== "text" &&
          visibleMessages[j].type !== "system" &&
          visibleMessages[j].senderId === msg.senderId &&
          (j === i || (msg.uploadBatchId && visibleMessages[j].uploadBatchId === msg.uploadBatchId))
        ) {
          group.push(visibleMessages[j]);
          j++;
        }

        if (group.length > 1) {
          const displayGroup = group.slice(0, 4);
          const extraCount = group.length > 4 ? group.length - 4 : 0;
          
          elements.push(
            <div
              key={`wrap-${msg.id}`}
              id={`wrap-${msg.id}`} 
              onClick={() => selectMode && toggleSelectMessage(msg.id)}
              className={selectMode ? "cursor-pointer" : ""}
            >
              {selectMode && (
                <div className={`flex ${msg.isOwn ? "justify-end" : "justify-start"} mb-1`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMessages.has(msg.id) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                    {selectedMessages.has(msg.id) && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
              <div className={selectMode ? "pointer-events-none" : ""}>
                <MediaGridGroup
                  displayGroup={displayGroup}
                  group={group}
                  extraCount={extraCount}
                  secretKey={secretKey}
                  otherUser={otherUser}
                  activeChat={activeChat}
                  pinnedMessages={conversationData?.pinnedMessages || []} // ── PRO FIX: Passed pinned messages for Grid Preview ──
                  isGroupOwn={msg.isOwn}
                  setGridMenuOpen={setGridMenuOpen}
                  gridMenuOpen={gridMenuOpen}
                  toggleSelectMessage={toggleSelectMessage}
                  selectMode={selectMode}
                  setSelectMode={setSelectMode}
                  selectedMessages={selectedMessages}
                  onDeleteClick={() => {
                    const batchIds = group.map((m: any) => m.id);
                    setSelectedMessages(new Set(batchIds));
                    setIsDeleteDialogOpen(true);
                  }}
                />
              </div>
            </div>
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
            disappearsAt={msg.disappearsAt ?? undefined}
            mediaDeletedAt={msg.mediaDeletedAt ?? undefined}
            mediaStorageId={msg.mediaStorageId}
            mediaIv={msg.mediaIv}
            mediaOriginalName={msg.mediaOriginalName}
            reactions={msg.reactions}
            editedAt={msg.editedAt}
            readBy={msg.readBy}
            deliveredTo={msg.deliveredTo}
            otherUserId={activeChat?.userId}
            sentAt={msg.timestamp} 
            secretKey={secretKey} 
            otherUserPublicKey={otherUser?.publicKey}
            isStarred={msg.isStarred} // ── FIX: Pass isStarred ──
            isPinned={conversationData?.pinnedMessages?.includes(msg.id as any)} // ── FIX: Type cast to fix string vs Id error ──
            conversationId={activeChat?.conversationId ?? undefined} // ── FIX: Handle null gracefully ──
            replyToMessage={(() => {
              if (!msg.replyToMessageId) return null;
              const originalMsg = decryptedMessages.find(m => m.id === msg.replyToMessageId);
              if (!originalMsg) return null;
              
              const senderName = originalMsg.isOwn ? "You" : (activeChat?.username || "User");
              
              return {
                id: originalMsg.id, 
                text: originalMsg.text,
                senderName,
                type: originalMsg.type,
                mediaStorageId: originalMsg.mediaStorageId, 
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
    conversationData?.pinnedMessages, // ── PRO FIX: Added so Grid updates instantly on Pin/Unpin ──
  ]);

  const selectedArray = Array.from(selectedMessages);
  let canDeleteForEveryone = false;

  if (selectedArray.length > 0) {
    const selectedMsgs = selectedArray.map(id => decryptedMessages.find(m => m.id === id)).filter(Boolean);
    const ONE_HOUR = 60 * 60 * 1000;
    const allOwn = selectedMsgs.every(m => m!.isOwn);
    const allWithinTime = selectedMsgs.every(m => Date.now() - m!.timestamp < ONE_HOUR);

    if (allOwn && allWithinTime) {
      if (selectedArray.length === 1) {
        canDeleteForEveryone = true;
      } else {
        const firstBatchId = selectedMsgs[0]!.uploadBatchId;
        if (firstBatchId && selectedMsgs.every(m => m!.uploadBatchId === firstBatchId)) {
          canDeleteForEveryone = true;
        }
      }
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
    if (!userId || selectedArray.length === 0) return;

    try {
      await Promise.all(
        selectedArray.map((msgId) =>
          deleteMessageForEveryone({
            messageId: msgId as Id<"messages">,
            userId: userId as Id<"users">
          })
        )
      );

      toast.success("Messages deleted for everyone");
      setIsDeleteDialogOpen(false);
      exitSelectMode();
    } catch {
      toast.error("Failed to delete messages");
    }
  };

  // ── FIX: Bouncing Dots Animation Component ──
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
      className={`flex-1 flex flex-col min-w-0 bg-background transition-colors duration-300 relative ${themeClass}`}
      style={customThemeStyles}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ChatHeader />

      {/* ── PRO FIX: Pinned Messages Bar ── */}
      {conversationData?.pinnedMessages && conversationData.pinnedMessages.length > 0 && (
        <div 
          className="bg-accent/40 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-accent/60 transition-colors z-10 shadow-sm"
          onClick={() => {
            const pinnedIds = conversationData.pinnedMessages!;
            const targetId = pinnedIds[currentPinnedIndex % pinnedIds.length];
            setJumpToMessageId(targetId);
            // Agar 1 se zyada pinned hain, tou agle click par next message par cycle karo
            if (pinnedIds.length > 1) {
              setCurrentPinnedIndex((prev) => (prev + 1) % pinnedIds.length);
            }
          }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <Pin size={16} className="text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-primary leading-tight">Pinned Message</span>
              <span className="text-[13px] text-muted-foreground truncate leading-tight">
                {(() => {
                  const pinnedIds = conversationData.pinnedMessages!;
                  const targetId = pinnedIds[currentPinnedIndex % pinnedIds.length];
                  const pMsg = decryptedMessages.find(m => m.id === targetId);
                  if (!pMsg) return "Tap to view message...";
                  if (pMsg.type === "text") return pMsg.text;
                  return `Attachment: ${pMsg.type}`;
                })()}
              </span>
            </div>
          </div>
          {conversationData.pinnedMessages.length > 1 && (
            <div className="text-[11px] font-semibold text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full shrink-0">
              {(currentPinnedIndex % conversationData.pinnedMessages.length) + 1}/{conversationData.pinnedMessages.length}
            </div>
          )}
        </div>
      )}

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

        {/* ── FIX: Show Animated Typing Bubble at the bottom ── */}
        {isTyping && <TypingBubble />}

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
