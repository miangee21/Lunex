import { useState, useEffect, useRef, useMemo } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/ChatBubble";
import {
  CheckSquare,
  X,
  Play,
  FileText,
  RotateCw,
  ChevronDown,
  Download,
  CornerDownLeft,
  Trash2,
  Film,
  Image as ImageIcon,
} from "lucide-react";
import { decryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";
import MediaPreview from "@/components/chat/MediaPreview";
import LunexLogo from "@/components/shared/LunexLogo";
import { toast } from "sonner";

// ── FIX: Added timestamp: number here ──
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

function CustomTickIcon({
  msg,
  otherUserId,
}: {
  msg: DecryptedMessage;
  otherUserId?: string;
}) {
  const isSeen = otherUserId
    ? msg.readBy?.some((r) => r.userId === otherUserId)
    : false;
  const isDelivered = otherUserId
    ? msg.deliveredTo?.some((d) => d.userId === otherUserId)
    : false;

  if (isSeen) {
    return (
      <svg
        className="w-3.5 h-3.5 ml-1 text-current opacity-100 flex-shrink-0 drop-shadow-md"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    );
  }
  if (isDelivered) {
    return (
      <svg
        className="w-3.5 h-3.5 ml-1 text-current opacity-90 flex-shrink-0 drop-shadow-md"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <circle cx="12" cy="12" r="10" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12.5l2.5 2.5l5 -5"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-3.5 h-3.5 ml-1 text-current opacity-90 flex-shrink-0 drop-shadow-md"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function MediaGridItem({
  msg,
  className,
  gallery = [],
  galleryIndex = 0,
  secretKey,
  theirPublicKeyBase64,
  otherUserId,
  forceDownload,
}: {
  msg: DecryptedMessage;
  className?: string;
  gallery?: Array<any>;
  galleryIndex?: number;
  secretKey: any;
  theirPublicKeyBase64?: string;
  otherUserId?: string;
  forceDownload?: boolean;
}) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);
  const [previewOpen, setPreviewOpen] = useState(false);
  const instantUrl = msg.mediaStorageId
    ? localMediaCache[msg.mediaStorageId]
    : null;
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);

  // ── FIX: Direct Cache Injection (Anti-Flicker) ──
  const finalUrl = instantUrl || decryptedUrl;

  const [isDownloaded, setIsDownloaded] = useState(
    msg.isOwn || !!instantUrl || forceDownload,
  );

  useEffect(() => {
    if (forceDownload) setIsDownloaded(true);
  }, [forceDownload]);

  useEffect(() => {
    const handleReopen = (e: any) => {
      if (e.detail.id === msg.id) {
        setPreviewOpen(true);
      }
    };
    window.addEventListener("reopen-preview", handleReopen);
    return () => window.removeEventListener("reopen-preview", handleReopen);
  }, [msg.id]);

  const encryptedFileUrl = useQuery(
    api.media.getFileUrl,
    !instantUrl && msg.mediaStorageId
      ? { storageId: msg.mediaStorageId as Id<"_storage"> }
      : "skip",
  );

  useEffect(() => {
    if (
      instantUrl ||
      !isDownloaded ||
      !encryptedFileUrl ||
      !msg.mediaIv ||
      !secretKey ||
      !theirPublicKeyBase64 ||
      finalUrl
    )
      return;
    let isMounted = true;
    async function decrypt() {
      try {
        const mimeType = getMimeTypeFromName(msg.mediaOriginalName ?? "");
        const url = await decryptMediaFile(
          encryptedFileUrl!,
          msg.mediaIv!,
          secretKey,
          base64ToKey(theirPublicKeyBase64!),
          mimeType,
        );
        if (isMounted) {
          setDecryptedUrl(url);
          if (msg.mediaStorageId)
            useChatStore.getState().addLocalMediaCache(msg.mediaStorageId, url);
        }
      } catch (err) {
        if (isMounted) setIsDownloaded(false);
      }
    }
    decrypt();
    return () => {
      isMounted = false;
    };
  }, [
    encryptedFileUrl,
    msg.mediaIv,
    secretKey,
    theirPublicKeyBase64,
    instantUrl,
    isDownloaded,
    finalUrl,
    msg.mediaStorageId,
  ]);

  return (
    <>
      {previewOpen && msg.mediaStorageId && (
        <MediaPreview
          storageId={msg.mediaStorageId}
          messageId={msg.id}
          text={msg.text}
          isOwn={msg.isOwn}
          decryptedUrl={finalUrl}
          type={
            msg.type === "text"
              ? "file"
              : (msg.type as "image" | "video" | "file")
          }
          originalName={msg.mediaOriginalName}
          mediaIv={msg.mediaIv}
          secretKey={secretKey}
          theirPublicKey={
            theirPublicKeyBase64 ? base64ToKey(theirPublicKeyBase64) : undefined
          }
          onClose={() => setPreviewOpen(false)}
          gallery={gallery}
          galleryIndex={galleryIndex}
        />
      )}
      <div
        className={`relative cursor-pointer overflow-hidden bg-black/10 dark:bg-white/10 ${className}`}
        onClick={() => {
          if (finalUrl) setPreviewOpen(true);
        }}
      >
        {msg.type === "image" && finalUrl ? (
          <img
            src={finalUrl}
            alt="image"
            className="absolute inset-0 w-full h-full object-cover hover:opacity-90 transition-opacity"
          />
        ) : msg.type === "video" && finalUrl ? (
          <div className="absolute inset-0 w-full h-full">
            <video
              src={finalUrl}
              className="w-full h-full object-cover"
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play size={14} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          </div>
        ) : msg.type === "file" && finalUrl ? (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black/5 p-2 transition-colors hover:bg-black/10">
            <FileText size={24} className="opacity-70 mb-2" />
            <p className="text-[10px] font-semibold truncate w-full text-center px-1">
              {msg.mediaOriginalName ?? "File"}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/20 dark:bg-white/5">
            {msg.type === "video" ? (
              <Film size={32} className="text-white opacity-40" />
            ) : msg.type === "file" ? (
              <FileText size={32} className="text-white opacity-40" />
            ) : (
              <ImageIcon size={32} className="text-white opacity-40" />
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── FIX: Smart Central Wrapper (Fixed Infinite Loader) ──
function GridGroupWrapper({
  displayGroup,
  group,
  extraCount,
  secretKey,
  otherUser,
  activeChat,
  isGroupOwn,
  setGridMenuOpen,
  gridMenuOpen,
  toggleSelectMessage,
  selectMode,
  setSelectMode,
  selectedMessages,
}: any) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);

  // ── THE BUG WAS HERE: It now correctly checks ONLY the visible 4 items (displayGroup) ──
  const allDownloaded =
    isGroupOwn ||
    displayGroup.every(
      (m: any) => m.mediaStorageId && localMediaCache[m.mediaStorageId],
    );

  const [forceDownload, setForceDownload] = useState(false);

  const msg = group[group.length - 1];

  return (
    <div
      className={`flex w-full group/grid py-1 ${isGroupOwn ? "justify-end" : "justify-start"} ${selectMode ? "cursor-pointer" : ""}`}
      onClick={() => selectMode && toggleSelectMessage(msg.id)}
    >
      {selectMode && (
        <div className="flex items-center justify-center mr-2 mb-1">
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

      <div
        className={`relative group px-1.5 pt-1.5 pb-6 rounded-2xl shadow-sm transition-all duration-200 w-[240px] sm:w-[280px] ${isGroupOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-card-foreground border border-border/50 rounded-bl-sm"}`}
      >
        <div
          className={`relative grid gap-1 w-full aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 ${displayGroup.length === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2"}`}
        >
          {displayGroup.map((gMsg: any, gIdx: number) => (
            <div
              key={gMsg.id}
              className={`relative w-full h-full ${displayGroup.length === 3 && gIdx === 0 ? "col-span-2" : ""}`}
            >
              <MediaGridItem
                msg={gMsg}
                className="absolute inset-0 w-full h-full"
                secretKey={secretKey}
                theirPublicKeyBase64={otherUser?.publicKey}
                otherUserId={activeChat?.userId}
                forceDownload={forceDownload}
                gallery={group.map((m: any) => ({
                  storageId: m.mediaStorageId!,
                  messageId: m.id,
                  text: m.text,
                  isOwn: m.isOwn,
                  type: m.type as "image" | "video" | "file",
                  originalName: m.mediaOriginalName,
                  mediaIv: m.mediaIv,
                }))}
                galleryIndex={gIdx}
              />
              {gIdx === 3 && extraCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-10 backdrop-blur-[1px]">
                  <span className="text-white font-bold text-2xl">
                    +{extraCount}
                  </span>
                </div>
              )}
            </div>
          ))}

          {!allDownloaded && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              {!forceDownload ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setForceDownload(true);
                  }}
                  className="w-14 h-14 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-all shadow-2xl border border-white/20 hover:scale-105"
                  title="Download All"
                >
                  <Download size={26} />
                </button>
              ) : (
                <div className="w-12 h-12 rounded-full border-[3.5px] border-white/30 border-t-white animate-spin shadow-2xl"></div>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10.5px] font-medium opacity-70 z-10 text-current">
          <span>{msg.time}</span>
          {isGroupOwn && (
            <CustomTickIcon msg={msg} otherUserId={activeChat?.userId} />
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setGridMenuOpen(msg.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md z-10`}
        >
          <ChevronDown size={14} />
        </button>
        {gridMenuOpen === msg.id && (
          <div className="absolute top-9 right-2 w-48 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Feature coming soon!");
                setGridMenuOpen(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors"
            >
              <CornerDownLeft size={14} className="text-muted-foreground" />{" "}
              Reply
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Feature coming soon!");
                setGridMenuOpen(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors"
            >
              <Download size={14} className="text-muted-foreground" /> Download
              All
            </button>
            <div className="h-px bg-border w-full" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectMode(true);
                toggleSelectMessage(msg.id);
                setGridMenuOpen(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors text-foreground"
            >
              <CheckSquare size={14} className="text-muted-foreground" /> Select
              Mode
            </button>
            <div className="h-px bg-border w-full" />
            {isGroupOwn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success("Feature coming soon!");
                  setGridMenuOpen(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-destructive/10 transition-colors text-destructive"
              >
                <Trash2 size={14} /> Delete for everyone
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Feature coming soon!");
                setGridMenuOpen(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-destructive/10 transition-colors text-destructive"
            >
              <Trash2 size={14} /> Delete for me
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatArea() {
  const {
    activeChat,
    clearActiveChat,
    syncChatTheme,
    updateLastMessageCache,
    updateReadByCache,
    updateDeliveredToCache,
    pendingUploads,
    updateUploadStatus,
    removePendingUpload,
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

  // ── FIX: Ab scroll tabhi hoga jab message ya upload start/end ho, progress par bar bar nahi ──
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

  // ── FIX: Smart Memory - Jab Upload Progress chal rahi ho, toh pichle messages ko re-render mat karo! (Super Fast Speed) ──
  const pendingNamesStr = currentPending.map(p => p.file.name).sort().join('|');
  const memoizedMessages = useMemo(() => {
    const pendingNames = new Set(pendingNamesStr.split('|').filter(Boolean));
    const now = Date.now();
    
    const visibleMessages = decryptedMessages.filter(msg => {
      if (msg.isOwn && pendingNames.size > 0 && msg.mediaOriginalName && pendingNames.has(msg.mediaOriginalName)) {
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
        while (j < visibleMessages.length && visibleMessages[j].type !== "text" && visibleMessages[j].senderId === msg.senderId) {
          group.push(visibleMessages[j]);
          j++;
        }

        if (group.length > 1) {
          const displayGroup = group.slice(0, 4);
          const extraCount = group.length > 4 ? group.length - 4 : 0;
          
          elements.push(
            <GridGroupWrapper 
              key={`wrap-${msg.id}`} displayGroup={displayGroup} group={group} extraCount={extraCount} 
              secretKey={secretKey} otherUser={otherUser} activeChat={activeChat} isGroupOwn={msg.isOwn} 
              setGridMenuOpen={setGridMenuOpen} gridMenuOpen={gridMenuOpen} toggleSelectMessage={toggleSelectMessage} 
              selectMode={selectMode} setSelectMode={setSelectMode} selectedMessages={selectedMessages}
            />
          );
          i = j;
          continue;
        }
      }

      elements.push(
        <div key={msg.id} onClick={() => selectMode && toggleSelectMessage(msg.id)} className={selectMode ? "cursor-pointer" : ""}>
          {selectMode && (
            <div className={`flex ${msg.isOwn ? "justify-end" : "justify-start"} mb-1`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMessages.has(msg.id) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                {selectedMessages.has(msg.id) && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
            </div>
          )}
          <MessageBubble messageId={msg.id} text={msg.text} time={msg.time} isOwn={msg.isOwn} type={msg.type} mediaStorageId={msg.mediaStorageId} mediaIv={msg.mediaIv} mediaOriginalName={msg.mediaOriginalName} reactions={msg.reactions} editedAt={msg.editedAt} readBy={msg.readBy} deliveredTo={msg.deliveredTo} otherUserId={activeChat?.userId} onSelect={() => { setSelectMode(true); toggleSelectMessage(msg.id); }} />
        </div>
      );
      i++;
    }
    return elements;
  }, [decryptedMessages, pendingNamesStr, selectMode, selectedMessages, gridMenuOpen, secretKey, otherUser, activeChat]);

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
          e.preventDefault(); e.stopPropagation();
          const menuWidth = 192; const menuHeight = 100;
          const x = e.clientX + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : e.clientX;
          const y = e.clientY + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 8 : e.clientY;
          setContextMenu({ x, y });
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : decryptedMessages.length === 0 && currentPending.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 opacity-90 animate-in fade-in duration-500"><LunexLogo className="w-24 h-24 rounded-full shadow-lg border-2 border-primary/20" /><div className="text-center space-y-1"><h3 className="text-lg font-bold text-foreground tracking-tight">Nothing here yet</h3><p className="text-sm text-muted-foreground max-w-[250px] mx-auto leading-relaxed">Send a message or media to start the conversation with <span className="font-semibold text-foreground">{activeChat?.username}</span>.</p></div></div>
        ) : (
          memoizedMessages
        )}

        {currentPending.length > 0 && (() => {
            const displayPending = currentPending.slice(0, 4);
            const extraPendingCount =
              currentPending.length > 4 ? currentPending.length - 4 : 0;
            const totalProgress =
              currentPending.reduce((acc, curr) => acc + curr.progress, 0) /
              currentPending.length;
            const hasError = currentPending.some((p) => p.status === "error");

            return (
              <div className="flex w-full group py-1.5 justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative flex items-start gap-2 flex-row-reverse">
                  <div
                    className={`relative px-1.5 pt-1.5 pb-6 rounded-2xl shadow-sm transition-all duration-200 bg-primary text-primary-foreground rounded-br-sm opacity-90 ${
                      currentPending.length === 1
                        ? "w-[240px] sm:w-[280px]"
                        : "w-[240px] sm:w-[280px]"
                    }`}
                  >
                    {currentPending.length === 1 ? (
                      <div
                        className={`relative rounded-xl overflow-hidden mb-1 bg-black/20 ${
                          currentPending[0].type === "image" ||
                          currentPending[0].type === "video"
                            ? "w-full aspect-[1.3] sm:aspect-[1.3]"
                            : "w-full aspect-square"
                        }`}
                      >
                        {currentPending[0].type === "image" ? (
                          <img
                            src={currentPending[0].previewUrl}
                            className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-75 pointer-events-none"
                          />
                        ) : currentPending[0].type === "video" ? (
                          <video
                            src={currentPending[0].previewUrl}
                            className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-75 pointer-events-none"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <FileText
                              size={40}
                              className="text-white opacity-80"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`grid gap-1 w-full aspect-square rounded-xl overflow-hidden bg-black/20 ${
                          displayPending.length === 2
                            ? "grid-cols-2 grid-rows-1"
                            : "grid-cols-2 grid-rows-2"
                        }`}
                      >
                        {displayPending.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`relative w-full h-full ${displayPending.length === 3 && idx === 0 ? "col-span-2" : ""}`}
                          >
                            {item.type === "image" ? (
                              <img
                                src={item.previewUrl}
                                className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-75 pointer-events-none"
                              />
                            ) : item.type === "video" ? (
                              <video
                                src={item.previewUrl}
                                className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-75 pointer-events-none"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                                <FileText
                                  size={24}
                                  className="text-white opacity-80"
                                />
                              </div>
                            )}
                            {idx === 3 && extraPendingCount > 0 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
                                <span className="text-white font-bold text-2xl">
                                  +{extraPendingCount}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="absolute top-1.5 left-1.5 right-1.5 bottom-6 flex items-center justify-center pointer-events-none rounded-xl z-20">
                      {hasError ? (
                        <div className="flex gap-4 items-center pointer-events-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.success("Resending...");
                              currentPending.forEach((p) => {
                                if (p.status === "error") {
                                  window.dispatchEvent(
                                    new CustomEvent("retry-upload", {
                                      detail: { id: p.id },
                                    }),
                                  );
                                }
                              });
                            }}
                            className="flex flex-col items-center gap-1.5 text-white hover:text-primary transition-colors bg-black/60 p-3 rounded-full backdrop-blur-sm shadow-xl"
                            title="Resend"
                          >
                            <RotateCw size={24} />
                            <span className="text-[10px] font-bold tracking-wider uppercase">
                              Resend
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              currentPending.forEach((p) =>
                                removePendingUpload(
                                  activeChat.conversationId!,
                                  p.id,
                                ),
                              );
                            }}
                            className="flex flex-col items-center gap-1.5 text-white hover:text-destructive transition-colors bg-black/60 p-3 rounded-full backdrop-blur-sm shadow-xl"
                            title="Cancel"
                          >
                            <Trash2 size={24} />
                            <span className="text-[10px] font-bold tracking-wider uppercase">
                              Clear
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="group/spinner pointer-events-auto relative flex flex-col items-center bg-black/60 w-16 h-16 rounded-full justify-center backdrop-blur-sm shadow-xl cursor-pointer hover:bg-black/80 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            currentPending.forEach((p) => {
                              if (
                                p.status === "uploading" &&
                                p.progress < 100
                              ) {
                                updateUploadStatus(
                                  activeChat.conversationId!,
                                  p.id,
                                  "error",
                                );
                              }
                            });
                          }}
                          title="Cancel Upload"
                        >
                          <div className="absolute w-12 h-12 rounded-full border-[3px] border-white/20 border-t-white animate-spin group-hover/spinner:opacity-0 transition-opacity"></div>
                          <span className="text-white text-[10px] font-bold mt-0.5 group-hover/spinner:opacity-0 transition-opacity">
                            {Math.round(totalProgress)}%
                          </span>
                          <X
                            className="absolute text-white opacity-0 group-hover/spinner:opacity-100 transition-opacity"
                            size={28}
                          />
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10.5px] font-medium opacity-70">
                      <span>{hasError ? "Failed" : "Sending..."}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

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
