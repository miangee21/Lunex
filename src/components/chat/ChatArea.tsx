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
  const { activeChat, clearActiveChat, syncChatTheme } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── STATE: Custom Context Menu ──
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

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
    readBy: string[];
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
              return {
                ...msg,
                text,
                time: new Date(msg.sentAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              };
            }
            const theirPublicKey = base64ToKey(otherUser.publicKey);
            text = decryptMessage(
              { encryptedContent: msg.encryptedContent, iv: msg.iv },
              secretKey!,
              theirPublicKey,
            );
          } catch {
            text = "🔒 Unable to decrypt message";
          }
          return {
            id: msg.id,
            text,
            time: new Date(msg.sentAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isOwn: msg.isOwn,
            senderId: msg.senderId,
            reactions: msg.reactions,
            editedAt: msg.editedAt,
            readBy: msg.readBy,
          };
        }),
      );
      setDecryptedMessages(result);
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
          setContextMenu({ x: e.clientX, y: e.clientY });
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
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MessageBubble
                text={msg.text}
                time={msg.time}
                isOwn={msg.isOwn}
                reactions={msg.reactions}
                editedAt={msg.editedAt}
                readBy={msg.readBy}
              />
            </div>
          ))
        )}
        {/* Auto scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput />

      {/* Right-Click Custom Context Menu UI */}
      {contextMenu && (
        <div
          className="fixed z-50 w-48 bg-card border border-border shadow-xl rounded-xl overflow-hidden animate-in fade-in-80 zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              console.log("Select messages clicked");
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
