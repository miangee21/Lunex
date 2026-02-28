import { useState, useEffect, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/ChatBubble";
import { CheckSquare, X, Play, FileText } from "lucide-react";
import { decryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { decryptMediaFile, getMimeTypeFromName } from "@/crypto/mediaEncryption";
import MediaPreview from "@/components/chat/MediaPreview";

export default function ChatArea() {
  const {
    activeChat,
    clearActiveChat,
    syncChatTheme,
    updateLastMessageCache,
    updateReadByCache,
    updateDeliveredToCache,
  } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── STATE: Custom Context Menu ──
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // ── STATE: Selected Messages ──
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
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

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ── CLOUD SYNC: Per-Chat Themes ──
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

  // ── MARK AS READ + DELIVERED ──
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

  // ── DECRYPT MESSAGES ──
  type DecryptedMessage = {
    id: string;
    text: string;
    time: string;
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

      // ── Cache update ──
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

  // ── AUTO SCROLL ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decryptedMessages]);

  // ── MEDIA GRID ITEM ──
  function MediaGridItem({
    msg,
    isLast,
    isOdd,
    totalCount,
    index,
    gallery = [],
    galleryIndex = 0,
  }: {
    msg: DecryptedMessage;
    isLast: boolean;
    isOdd: boolean;
    totalCount: number;
    index: number;
    gallery?: Array<{
      storageId: string;
      type: "image" | "video" | "file";
      originalName?: string | null;
      mediaIv?: string | null; // ── FIX: Added mediaIv so gallery can decrypt ──
    }>;
    galleryIndex?: number;
  }) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);

    const encryptedFileUrl = useQuery(
      api.media.getFileUrl,
      msg.mediaStorageId
        ? { storageId: msg.mediaStorageId as Id<"_storage"> }
        : "skip",
    );

    // ── MAGIC FIX: Decrypt the media just like MessageBubble does ──
    useEffect(() => {
      if (!encryptedFileUrl || !msg.mediaIv || !secretKey || !otherUser?.publicKey) return;
      if (decryptedUrl) return;

      let isMounted = true;
      async function decrypt() {
        try {
          const mimeType = getMimeTypeFromName(msg.mediaOriginalName ?? "");
          const url = await decryptMediaFile(
            encryptedFileUrl,
            msg.mediaIv!,
            secretKey!,
            base64ToKey(otherUser!.publicKey),
            mimeType
          );
          if (isMounted) setDecryptedUrl(url);
        } catch (err) {
          console.error("Gallery item decryption failed", err);
        }
      }
      decrypt();

      return () => { isMounted = false; };
    }, [encryptedFileUrl, msg.mediaIv, secretKey, otherUser?.publicKey]);

    const isWide = isOdd && isLast;

    return (
      <>
        {previewOpen && msg.mediaStorageId && (
          <MediaPreview
            storageId={msg.mediaStorageId}
            decryptedUrl={decryptedUrl} // Pass decrypted URL so modal opens instantly
            type={msg.type === "text" ? "file" : msg.type as "image" | "video" | "file"}
            originalName={msg.mediaOriginalName}
            mediaIv={msg.mediaIv}
            secretKey={secretKey ?? undefined}
            theirPublicKey={otherUser?.publicKey ? base64ToKey(otherUser.publicKey) : undefined}
            onClose={() => setPreviewOpen(false)}
            gallery={gallery}
            galleryIndex={galleryIndex}
          />
        )}
        <div
          className={`relative cursor-pointer overflow-hidden bg-black/10 ${isWide ? "col-span-2" : ""}`}
          style={{ aspectRatio: isWide ? "2/1" : "1/1" }}
          onClick={() => {
             if (decryptedUrl) setPreviewOpen(true);
          }}
        >
          {msg.type === "image" && decryptedUrl ? (
            <img
              src={decryptedUrl}
              alt={msg.mediaOriginalName ?? "image"}
              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
            />
          ) : msg.type === "video" && decryptedUrl ? (
            <div className="relative w-full h-full">
              <video
                src={decryptedUrl}
                className="w-full h-full object-cover"
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play size={16} className="text-white ml-0.5" fill="white" />
                </div>
              </div>
            </div>
          ) : msg.type === "file" && decryptedUrl ? (
             // ── FIX: Added File support in the grid so ZIPs don't spin endlessly ──
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/5 dark:bg-white/5 p-2 transition-colors hover:bg-black/10 dark:hover:bg-white/10">
              <FileText size={28} className="opacity-70 mb-2" />
              <p className="text-[11px] font-semibold truncate w-full text-center px-1">
                {msg.mediaOriginalName ?? "File"}
              </p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      </>
    );
  }

  if (!activeChat) return null;

  // ── THEME ──
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

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 bg-background transition-colors duration-300 relative ${themeClass}`}
      style={customThemeStyles}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <ChatHeader />

      {/* Messages Area */}
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
        ) : decryptedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              No messages yet — say hello! 👋
            </p>
          </div>
        ) : (
          (() => {
            const elements: React.ReactNode[] = [];
            let i = 0;

            while (i < decryptedMessages.length) {
              const msg = decryptedMessages[i];

              // ── Media Group ──
              if (msg.type !== "text" && !selectMode) {
                const group: typeof decryptedMessages = [];
                let j = i;
                while (
                  j < decryptedMessages.length &&
                  decryptedMessages[j].type !== "text" &&
                  decryptedMessages[j].senderId === msg.senderId &&
                  group.length < 10
                ) {
                  group.push(decryptedMessages[j]);
                  j++;
                }

                if (group.length > 1) {
                  elements.push(
                    <div
                      key={`group-${msg.id}`}
                      className={`flex w-full py-1 ${msg.isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[75%] md:max-w-[65%]">
                        <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
                          {group.map((gMsg, gIdx) => (
                            <MediaGridItem
                              key={gMsg.id}
                              msg={gMsg}
                              isLast={gIdx === group.length - 1}
                              isOdd={group.length % 2 !== 0}
                              totalCount={group.length}
                              index={gIdx}
                              gallery={group.map((m) => ({
                                storageId: m.mediaStorageId!,
                                type: m.type as "image" | "video" | "file",
                                originalName: m.mediaOriginalName,
                              }))}
                              galleryIndex={gIdx}
                            />
                          ))}
                        </div>
                        <div
                          className={`flex items-center gap-1 mt-1 text-[10.5px] font-medium text-muted-foreground ${msg.isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <span>{group[group.length - 1].time}</span>
                        </div>
                      </div>
                    </div>,
                  );
                  i = j;
                  continue;
                }
              }

              // ── Single Message ──
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
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedMessages.has(msg.id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
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
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        selectMode={selectMode}
        selectedCount={selectedMessages.size}
        onCancelSelect={exitSelectMode}
        onDeleteSelected={() => {
          console.log("Deleting:", Array.from(selectedMessages));
          exitSelectMode();
        }}
      />

      {/* Right-Click Context Menu */}
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
