import {
  ChevronDown,
  Reply,
  Copy,
  CheckSquare,
  Pencil,
  Trash2,
  Info,
  FileText,
  Download,
  Play,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import MediaPreview from "@/components/chat/MediaPreview";

interface MessageBubbleProps {
  messageId: string;
  text: string;
  time: string;
  isOwn: boolean;
  type?: "text" | "image" | "video" | "file";
  mediaStorageId?: string | null;
  mediaIv?: string | null;
  mediaOriginalName?: string | null;
  reactions?: Array<{ userId: string; emoji: string }>;
  editedAt?: number | null;
  readBy?: { userId: string; time: number }[];
  deliveredTo?: { userId: string; time: number }[];
  otherUserId?: string;
  onSelect?: () => void;
}

export default function MessageBubble({
  messageId,
  text,
  time,
  isOwn,
  type = "text",
  mediaStorageId = null,
  mediaIv = null,
  mediaOriginalName = null,
  reactions = [],
  editedAt = null,
  readBy = [],
  deliveredTo = [],
  otherUserId,
  onSelect,
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const setSelectedMessageForInfo = useChatStore(
    (s) => s.setSelectedMessageForInfo,
  );

  // ── Media URL (encrypted) ──
  const encryptedFileUrl = useQuery(
    api.media.getFileUrl,
    mediaStorageId ? { storageId: mediaStorageId as Id<"_storage"> } : "skip",
  );

  const secretKey = useAuthStore((s) => s.secretKey);
  const { activeChat } = useChatStore();
  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId ? { userId: activeChat.userId as never } : "skip"
  );

  // ── Decrypted Object URL ──
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (!encryptedFileUrl || !mediaIv || !secretKey || !otherUser?.publicKey)
      return;
    if (decryptedUrl) return; // already decrypted

    async function decrypt() {
      setIsDecrypting(true);
      try {
        const mimeType = getMimeTypeFromName(mediaOriginalName ?? "");
        const url = await decryptMediaFile(
          encryptedFileUrl!,
          mediaIv!,
          secretKey!,
          base64ToKey(otherUser!.publicKey),
          mimeType,
        );
        setDecryptedUrl(url);
      } catch {
        // decrypt fail — silently ignore
      } finally {
        setIsDecrypting(false);
      }
    }

    decrypt();

    // Cleanup object URL on unmount
    return () => {
      if (decryptedUrl) URL.revokeObjectURL(decryptedUrl);
    };
  }, [encryptedFileUrl, mediaIv, secretKey, otherUser?.publicKey]);

  // Truncation
  const CHAR_LIMIT = 250;
  const shouldTruncate = text.length > CHAR_LIMIT;
  const displayText =
    shouldTruncate && !isExpanded ? text.slice(0, CHAR_LIMIT) + "..." : text;

  // ── TICKS ──
  const isSeen = otherUserId
    ? readBy.some((r) => r.userId === otherUserId)
    : false;
  const isDelivered = otherUserId
    ? deliveredTo.some((d) => d.userId === otherUserId)
    : false;

  function TickIcon() {
    if (isSeen) {
      return (
        <svg
          className="w-3.5 h-3.5 ml-1 text-current opacity-100 flex-shrink-0"
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
          className="w-3.5 h-3.5 ml-1 text-current opacity-70 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
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
        className="w-3.5 h-3.5 ml-1 text-current opacity-70 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }

  // ── MEDIA CONTENT ──
  function MediaContent() {
    if (type === "image") {
      return (
        <div
          className="relative cursor-pointer rounded-xl overflow-hidden mb-1 max-w-[260px]"
          onClick={() => decryptedUrl && setPreviewOpen(true)}
        >
          {decryptedUrl ? (
            <img
              src={decryptedUrl}
              alt={mediaOriginalName ?? "image"}
              className="w-full h-auto max-h-[200px] object-cover rounded-xl hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-[200px] h-[140px] bg-black/10 dark:bg-white/10 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin opacity-50" />
            </div>
          )}
        </div>
      );
    }

    if (type === "video") {
      return (
        <div
          className="relative cursor-pointer rounded-xl overflow-hidden mb-1 max-w-[260px]"
          onClick={() => decryptedUrl && setPreviewOpen(true)}
        >
          {decryptedUrl ? (
            <div className="relative">
              <video
                src={decryptedUrl}
                className="w-full h-auto max-h-[200px] object-cover rounded-xl"
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl hover:bg-black/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play size={20} className="text-white ml-0.5" fill="white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-[200px] h-[140px] bg-black/10 dark:bg-white/10 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin opacity-50" />
            </div>
          )}
        </div>
      );
    }

    if (type === "file") {
      return (
        <div
          className="flex items-center gap-3 mb-1 p-3 rounded-xl bg-black/10 dark:bg-white/10 cursor-pointer hover:bg-black/15 dark:hover:bg-white/15 transition-colors max-w-[240px]"
          onClick={() => decryptedUrl && setPreviewOpen(true)}
        >
          <div className="w-9 h-9 rounded-lg bg-current/10 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="opacity-70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">
              {mediaOriginalName ?? "Document"}
            </p>
            <p className="text-[11px] opacity-60 mt-0.5">Tap to open</p>
          </div>
          <Download size={15} className="opacity-50 flex-shrink-0" />
        </div>
      );
    }

    return null;
  }

  const isMedia = type !== "text";

  return (
    <>
      {/* Media Preview Modal */}
      {previewOpen && decryptedUrl && (
        <MediaPreview
          storageId={mediaStorageId ?? ""}
          decryptedUrl={decryptedUrl}
          type={type === "text" ? "file" : type as "image" | "video" | "file"}
          originalName={mediaOriginalName}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      <div
        className={`flex w-full group py-1.5 ${isOwn ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`relative flex max-w-[75%] md:max-w-[65%] items-start gap-2 ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* Message Bubble */}
          <div
            className={`
              relative px-4 pt-2.5 pb-2 rounded-2xl shadow-sm text-[15px] transition-all duration-200
              ${
                isOwn
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary border border-border/50 text-secondary-foreground rounded-bl-sm"
              }
            `}
          >
            {/* Media */}
            {isMedia && <MediaContent />}

            {/* Text — sirf text type ke liye */}
            {type === "text" && (
              <div className="leading-relaxed break-words pr-6 whitespace-pre-wrap">
                {displayText}
                {shouldTruncate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="ml-1 font-bold text-sm hover:underline focus:outline-none opacity-80 hover:opacity-100 transition-opacity"
                  >
                    {isExpanded ? "Read less" : "Read more"}
                  </button>
                )}
              </div>
            )}

            {/* Reactions */}
            {reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(
                  reactions.reduce(
                    (acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>,
                  ),
                ).map(([emoji, count]) => (
                  <span
                    key={emoji}
                    className="text-xs bg-black/10 dark:bg-white/10 rounded-full px-1.5 py-0.5"
                  >
                    {emoji} {count > 1 ? count : ""}
                  </span>
                ))}
              </div>
            )}

            {/* Time + Edited + Ticks */}
            <div className="flex justify-end items-center gap-1 mt-1 -mb-0.5 text-[10.5px] font-medium tracking-wide opacity-70">
              {editedAt && <span>edited</span>}
              <span>{time}</span>
              {isOwn && <TickIcon />}
            </div>

            {/* Hover Menu */}
            <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`
                      p-0.5 rounded-full flex items-center justify-center transition-colors focus:outline-none
                      ${
                        isOwn
                          ? "bg-primary text-primary-foreground hover:bg-black/10 dark:hover:bg-white/10"
                          : "bg-secondary text-secondary-foreground hover:bg-black/10 dark:hover:bg-white/10"
                      }
                    `}
                  >
                    <ChevronDown className="w-4 h-4 opacity-80" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={isOwn ? "end" : "start"}
                  className="w-48 shadow-lg rounded-xl"
                >
                  <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                    <Reply className="w-4 h-4 mr-2 text-muted-foreground" />{" "}
                    Reply
                  </DropdownMenuItem>
                  {type === "text" && (
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg py-2"
                      onClick={() => {
                        navigator.clipboard.writeText(text);
                        toast.success("Copied!");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2 text-muted-foreground" />{" "}
                      Copy
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg py-2"
                    onClick={() => onSelect?.()}
                  >
                    <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground" />{" "}
                    Select
                  </DropdownMenuItem>

                  {isOwn && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg py-2"
                        onClick={() =>
                          setSelectedMessageForInfo({ id: messageId, text })
                        }
                      >
                        <Info className="w-4 h-4 mr-2 text-muted-foreground" />{" "}
                        Info
                      </DropdownMenuItem>
                      {type === "text" && (
                        <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                          <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />{" "}
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => toast.info("Delete coming soon!")}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}

                  {!isOwn && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => toast.info("Delete coming soon!")}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
