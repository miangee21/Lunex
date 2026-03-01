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
    }
  }, [activeChat?.conversationId, rawMessages?.length]);

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
            reactions: msg.reactions,
            editedAt: msg.editedAt,
            readBy: msg.readBy,
            deliveredTo: msg.deliveredTo,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decryptedMessages, currentPending.length]);

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
        onDeleteSelected={() => {
          console.log("Deleting:", Array.from(selectedMessages));
          exitSelectMode();
        }}
      />

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
