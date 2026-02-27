import { useState, useEffect, useRef } from "react";
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

export default function ChatArea() {
 const { activeChat, clearActiveChat, syncChatTheme, updateLastMessageCache, updateReadByCache, updateDeliveredToCache } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── STATE: Custom Context Menu ──
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // ── STATE: Selected Messages ──
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

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

  // Close the right-click menu if the user clicks anywhere else
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ── CLOUD SYNC LOGIC FOR PER-CHAT THEMES ──
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

  // ── REAL MESSAGES ──
  const rawMessages = useQuery(
    api.messages.getMessages,
    activeChat?.conversationId && userId
      ? {
          conversationId: activeChat.conversationId as Id<"conversations">,
          userId: userId as Id<"users">,
        }
      : "skip",
  );

  // ── MARK AS READ ──
  const markAsRead = useMutation(api.messages.markMessagesAsRead);
  const markAsDelivered = useMutation(api.messages.markAsDelivered);
  const otherUser = useQuery(
  api.users.getUserById,
  activeChat?.userId ? { userId: activeChat.userId as never } : "skip"
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

  // ── DECRYPT MESSAGES ──
  type DecryptedMessage = {
    id: string;
    text: string;
    time: string;
    isOwn: boolean;
    senderId: string;
    reactions: Array<{ userId: string; emoji: string }>;
    editedAt: number | null;
    readBy: { userId: string; time: number }[];
    deliveredTo: { userId: string; time: number }[];
  };

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
                theirPublicKey
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
            isOwn: msg.isOwn,
            senderId: msg.senderId,
            reactions: msg.reactions,
            editedAt: msg.editedAt,
            readBy: msg.readBy,
            deliveredTo: msg.deliveredTo,
          };
        })
      );

      setDecryptedMessages(result);

      // ── Last message cache update karo ──
      if (result.length > 0 && activeChat?.conversationId) {
        const last = result[result.length - 1];
        const lastRaw = rawMessages![rawMessages!.length - 1];
        updateLastMessageCache(activeChat.conversationId, {
          text: last.text,
          senderId: last.senderId,
          sentAt: lastRaw.sentAt,
          type: lastRaw.type,
        });
        // ── ReadBy cache update karo ──
        updateReadByCache(activeChat.conversationId, lastRaw.readBy ?? []);
        // ── DeliveredTo cache update karo ──
        updateDeliveredToCache(activeChat.conversationId, lastRaw.deliveredTo ?? []);
      }
    }

    decryptAll();
  }, [rawMessages, secretKey, otherUser?.publicKey]);

  // ── AUTO SCROLL TO BOTTOM ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decryptedMessages]);

  if (!activeChat) return null;

  // ── PRESET THEME CLASS ──
  const themeClass = activeChat.chatPresetName
    ? `theme-${activeChat.chatPresetName.toLowerCase()}`
    : "";

  // ── CUSTOM OVERRIDES ──
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

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 bg-background transition-colors duration-300 relative ${themeClass}`}
      style={customThemeStyles}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <ChatHeader />

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Viewport bounds check — menu screen se bahar na jaye
          const menuWidth = 192;
          const menuHeight = 100;
          const x = e.clientX + menuWidth > window.innerWidth
            ? window.innerWidth - menuWidth - 8
            : e.clientX;
          const y = e.clientY + menuHeight > window.innerHeight
            ? window.innerHeight - menuHeight - 8
            : e.clientY;
          setContextMenu({ x, y });
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : decryptedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              No messages yet — say hello! 👋
            </p>
          </div>
        ) : (
          decryptedMessages.map((msg) => (
            <div
              key={msg.id}
              // ── FIX: Yahan se right-click blocker hata diya gaya hai ──
              onClick={() => selectMode && toggleSelectMessage(msg.id)}
              className={selectMode ? "cursor-pointer" : ""}
            >
              {/* Select mode checkbox */}
              {selectMode && (
                <div className={`flex ${msg.isOwn ? "justify-end" : "justify-start"} mb-1`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedMessages.has(msg.id)
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  }`}>
                    {selectedMessages.has(msg.id) && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
            </div>
          ))
        )}
       
        {/* Auto scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput 
        selectMode={selectMode}
        selectedCount={selectedMessages.size}
        onCancelSelect={exitSelectMode}
        onDeleteSelected={() => {
          // Future deletion logic yahan aayegi
          console.log("Deleting:", Array.from(selectedMessages));
          exitSelectMode();
        }}
      />

      {/* Right-Click Custom Context Menu UI */}
      {contextMenu && (
        <div
          className="fixed z-50 w-48 bg-card border border-border shadow-xl rounded-xl overflow-hidden animate-in fade-in-80 zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSelectMode(true); // ── FIX: Ab ye select mode on kar dega ──
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <CheckSquare size={14} className="text-muted-foreground" />
            Select messages
          </button>

          <div className="h-px bg-border w-full" />

          <button
            onClick={() => {
              clearActiveChat();
              setSelectMode(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <X size={14} />
            Close chat
          </button>
        </div>
      )}
    </div>
  );
}
