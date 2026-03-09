//src/components/chat/MessageInfoPanel.tsx
import { useState, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { base64ToKey } from "@/crypto/keyDerivation";
import DeletedMediaPlaceholder from "@/components/chat/media/DeletedMediaPlaceholder";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";
import { X, CalendarDays, Clock, Play, FileText } from "lucide-react";

function MiniMediaThumbnail({ msg }: { msg: any }) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);
  const secretKey = useAuthStore((s) => s.secretKey);
  const currentUserId = useAuthStore((s) => s.userId);
  const { activeChat } = useChatStore();

  if (msg.mediaDeletedAt) {
    return (
      <div className="relative w-40 h-25 mb-1.5 rounded-xl overflow-hidden bg-black/10 dark:bg-white/10 flex items-center justify-center border border-white/5">
        <div className="w-[180%] transform scale-[0.6] origin-center">
          <DeletedMediaPlaceholder
            type={msg.type || "file"}
            isOwn={msg.senderId === currentUserId}
          />
        </div>
      </div>
    );
  }

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId && currentUserId
      ? {
          userId: activeChat.userId as Id<"users">,
          viewerId: currentUserId as Id<"users">,
        }
      : "skip",
  );

  const instantUrl = msg.mediaStorageId
    ? localMediaCache[msg.mediaStorageId]
    : null;
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(
    instantUrl || null,
  );

  const encryptedFileUrl = useQuery(
    api.media.getFileUrl,
    !instantUrl && msg.mediaStorageId
      ? { storageId: msg.mediaStorageId as Id<"_storage"> }
      : "skip",
  );

  useEffect(() => {
    if (instantUrl) return;
    if (
      !encryptedFileUrl ||
      !msg.mediaIv ||
      !secretKey ||
      !otherUser?.publicKey
    )
      return;
    if (decryptedUrl) return;

    let isMounted = true;
    async function decrypt() {
      try {
        const mimeType = getMimeTypeFromName(msg.mediaOriginalName ?? "");
        const url = await decryptMediaFile(
          encryptedFileUrl!,
          msg.mediaIv!,
          secretKey!,
          base64ToKey(otherUser!.publicKey),
          mimeType,
        );
        if (isMounted) setDecryptedUrl(url);
      } catch (err) {
        console.error("Info panel thumbnail decryption failed", err);
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
    otherUser?.publicKey,
    instantUrl,
  ]);

  if (msg.type === "file") {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-black/10 dark:bg-white/10 rounded-xl mb-1.5 min-w-37.5">
        <FileText size={18} className="opacity-80" />
        <span className="text-[13px] font-medium truncate max-w-37.5">
          {msg.mediaOriginalName || "Document"}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-40 h-25 mb-1.5 rounded-xl overflow-hidden bg-black/10 dark:bg-white/10 flex items-center justify-center border border-white/5">
      {decryptedUrl ? (
        msg.type === "video" ? (
          <>
            <video
              src={decryptedUrl}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm shadow-lg">
                <Play size={14} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={decryptedUrl}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            alt="thumbnail"
          />
        )
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin opacity-50" />
      )}
    </div>
  );
}

interface MessageInfoPanelProps {
  messageId: string;
  messageText: string;
}

export default function MessageInfoPanel({
  messageId,
  messageText,
}: MessageInfoPanelProps) {
  const { activeChat, setSelectedMessageForInfo, selectedMessageForInfo } =
    useChatStore();
  const currentUserId = useAuthStore((s) => s.userId);

  const messages = useQuery(
    api.messages.getMessages,
    activeChat?.conversationId && currentUserId
      ? {
          conversationId: activeChat.conversationId as Id<"conversations">,
          userId: currentUserId as Id<"users">,
        }
      : "skip",
  );

  const msg = messages?.find((m) => m.id === messageId);
  const otherUserId = activeChat?.userId;

  const deliveredRecord = msg?.deliveredTo?.find(
    (d) => d.userId === otherUserId,
  );
  const readRecord = msg?.readBy?.find((r) => r.userId === otherUserId);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const themeClass = activeChat?.chatPresetName
    ? `theme-${activeChat.chatPresetName.toLowerCase()}`
    : "";

  const customThemeStyles = {
    ...(activeChat?.chatBgColor && {
      "--background": activeChat.chatBgColor,
      "--sidebar": activeChat.chatBgColor,
    }),
    ...(activeChat?.myBubbleColor && { "--primary": activeChat.myBubbleColor }),
    ...(activeChat?.otherBubbleColor && {
      "--secondary": activeChat.otherBubbleColor,
    }),
    ...(activeChat?.myTextColor && {
      "--primary-foreground": activeChat.myTextColor,
    }),
    ...(activeChat?.otherTextColor && {
      "--secondary-foreground": activeChat.otherTextColor,
    }),
  } as React.CSSProperties;

  if (!msg) {
    return (
      <div
        className={`h-full flex items-center justify-center bg-background/60 backdrop-blur-2xl border-l border-border/50 ${themeClass}`}
        style={customThemeStyles}
      >
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Loading details...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-background/60 backdrop-blur-2xl border-l border-border/50 animate-in slide-in-from-right duration-300 ${themeClass}`}
      style={customThemeStyles}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/50 bg-card/30">
        <h2 className="font-semibold text-foreground tracking-wide">
          Message Info
        </h2>
        <button
          onClick={() => {
            if (selectedMessageForInfo?.cameFromPreview) {
              window.dispatchEvent(
                new CustomEvent("reopen-preview", {
                  detail: { id: messageId },
                }),
              );
            }
            setSelectedMessageForInfo(null);
          }}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        <div className="flex flex-col items-end mb-10">
          <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-md relative bg-primary text-primary-foreground">
            {msg.type && msg.type !== "text" && (
              <MiniMediaThumbnail msg={msg} />
            )}

            {(!msg.type || msg.type === "text") && messageText && (
              <p className="text-[15px] leading-relaxed wrap-break-word mt-1">
                {messageText.replace(/\n/g, " ").length > 40
                  ? messageText.replace(/\n/g, " ").substring(0, 40) + "..."
                  : messageText.replace(/\n/g, " ")}
              </p>
            )}

            <div className="flex items-center justify-end gap-1 mt-1 opacity-80">
              <span className="text-[11px] font-medium">
                {formatTime(msg.sentAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {formatDate(msg.sentAt)}
          </h3>

          <div className="relative pl-6 border-l-2 border-border/40 space-y-8 ml-2">
            <div className="relative">
              <div
                className={`absolute -left-8.75 top-0.5 p-1 rounded-full bg-background ${
                  readRecord ? "text-primary" : "text-muted-foreground/30"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill={readRecord ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={readRecord ? 0 : 2}
                >
                  {readRecord ? (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  ) : (
                    <circle cx="12" cy="12" r="10" />
                  )}
                </svg>
              </div>
              <div>
                <p
                  className={`font-medium ${readRecord ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Read
                </p>
                {readRecord && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />{" "}
                    {formatTime(readRecord.time)}
                  </p>
                )}
              </div>
            </div>

            <div className="relative">
              <div
                className={`absolute -left-8.75 top-0.5 p-1 rounded-full bg-background ${deliveredRecord ? "text-muted-foreground" : "text-muted-foreground/30"}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  {deliveredRecord && (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12.5l2.5 2.5l5 -5"
                    />
                  )}
                </svg>
              </div>
              <div>
                <p
                  className={`font-medium ${deliveredRecord ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Delivered
                </p>
                {deliveredRecord && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />{" "}
                    {formatTime(deliveredRecord.time)}
                  </p>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8.75 top-0.5 p-1 rounded-full bg-background text-muted-foreground">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Sent</p>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {formatTime(msg.sentAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
