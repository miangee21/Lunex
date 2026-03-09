// src/components/chat/bubble/ChatBubble.tsx
import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { Smile, Plus, Star, Pin } from "lucide-react";
import MessageStatusTick from "@/components/chat/MessageStatusTick";
import BubbleMenu from "@/components/chat/bubble/BubbleMenu";
import BubbleMedia from "@/components/chat/bubble/BubbleMedia";
import EmojiPicker from "@/components/chat/EmojiPicker";
import BubbleReplyPreview from "@/components/chat/bubble/BubbleReplyPreview";
import { toast } from "sonner";

interface MessageBubbleProps {
  messageId: string;
  text: string;
  time: string;
  isOwn: boolean;
  type?: "text" | "image" | "video" | "file" | "system";
  mediaStorageId?: string | null;
  mediaIv?: string | null;
  mediaOriginalName?: string | null;
  mediaDeletedAt?: number | null;
  reactions?: Array<{ userId: string; emoji: string }>;
  editedAt?: number | null;
  disappearsAt?: number | null;
  readBy?: { userId: string; time: number }[];
  deliveredTo?: { userId: string; time: number }[];
  otherUserId?: string;
  onSelect?: () => void;
  replyToMessage?: {
    id: string;
    text: string;
    senderName: string;
    type: string;
    mediaStorageId?: string | null;
  } | null;
  sentAt?: number;
  secretKey?: Uint8Array | null;
  otherUserPublicKey?: string;
  isStarred?: boolean;
  isPinned?: boolean;
  conversationId?: string;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageBubble({
  messageId,
  text,
  time,
  isOwn,
  type = "text",
  mediaStorageId = null,
  mediaIv = null,
  mediaOriginalName = null,
  mediaDeletedAt = null,
  reactions = [],
  editedAt = null,
  disappearsAt = null,
  readBy = [],
  deliveredTo = [],
  otherUserId,
  onSelect,
  replyToMessage = null,
  sentAt = 0,
  secretKey,
  otherUserPublicKey,
  isStarred = false,
  isPinned = false,
  conversationId,
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickReact, setShowQuickReact] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState<"top" | "bottom">("top");
  const isMedia = type !== "text";
  const currentUserId = useAuthStore((s) => s.userId);
  const addReaction = useMutation(api.messages.addReaction);
  const removeReaction = useMutation(api.messages.removeReaction);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowQuickReact(false);
        setShowEmojiPicker(false);
      }
    }
    if (showQuickReact || showEmojiPicker)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showQuickReact, showEmojiPicker]);

  const handleEmojiSelect = async (emoji: string) => {
    if (!currentUserId || !secretKey || !otherUserPublicKey) {
      toast.error("Encryption keys missing!");
      return;
    }
    const myExistingReaction = reactions.find(
      (r) => r.userId === currentUserId,
    );
    try {
      if (myExistingReaction && myExistingReaction.emoji === emoji) {
        await removeReaction({
          messageId: messageId as never,
          userId: currentUserId as never,
        });
      } else {
        const theirPublicKeyBytes = base64ToKey(otherUserPublicKey);
        const { encryptedContent, iv } = encryptMessage(
          emoji,
          secretKey,
          theirPublicKeyBytes,
        );
        await addReaction({
          messageId: messageId as never,
          userId: currentUserId as never,
          encryptedEmoji: encryptedContent,
          iv: iv,
        });
      }
    } catch (error) {
      console.error(error);
    }
    setShowQuickReact(false);
    setShowEmojiPicker(false);
  };

  const handleScrollToOriginal = () => {
    if (!replyToMessage?.id) return;
    if (replyToMessage.type !== "text") {
      window.dispatchEvent(
        new CustomEvent("reopen-preview", {
          detail: { id: replyToMessage.id },
        }),
      );
    }
    const element =
      document.getElementById(`message-${replyToMessage.id}`) ||
      document.getElementById(`wrap-${replyToMessage.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add(
        "ring-2",
        "ring-primary",
        "bg-primary/20",
        "scale-[1.02]",
      );
      setTimeout(() => {
        element.classList.remove(
          "ring-2",
          "ring-primary",
          "bg-primary/20",
          "scale-[1.02]",
        );
      }, 1200);
    } else {
      if (replyToMessage.type === "text") {
        toast.info("Message is older and not loaded yet.");
      }
    }
  };

  const CHAR_LIMIT = 250;
  const shouldTruncate = text.length > CHAR_LIMIT;
  const displayText =
    shouldTruncate && !isExpanded ? text.slice(0, CHAR_LIMIT) + "..." : text;

  const isSeen = otherUserId
    ? readBy?.some((r) => r.userId === otherUserId)
    : false;
  const isDelivered = otherUserId
    ? deliveredTo?.some((d) => d.userId === otherUserId)
    : false;

  if (type === "system") {
    return (
      <div className="flex justify-center my-2 w-full">
        <span className="text-xs text-muted-foreground bg-accent/60 px-3 py-1 rounded-full">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div
      id={`message-${messageId}`}
      className={`flex w-full group py-1.5 transition-all duration-500 rounded-lg ${isOwn ? "justify-end" : "justify-start"} ${showQuickReact || showEmojiPicker ? "relative z-100" : "z-10"}`}
    >
      <div
        className={`relative flex max-w-[75%] md:max-w-[65%] items-start gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`relative flex flex-col px-4 pt-2.5 pb-2 rounded-2xl shadow-sm text-[15px] transition-all duration-200 ${replyToMessage ? "min-w-30" : ""} ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary border border-border/50 text-secondary-foreground rounded-bl-sm"}`}
        >
          {replyToMessage && (
            <BubbleReplyPreview
              replyToMessage={replyToMessage}
              isOwn={isOwn}
              onScrollToOriginal={handleScrollToOriginal}
            />
          )}

          {isMedia && (
            <BubbleMedia
              messageId={messageId}
              text={text}
              type={type as "image" | "video" | "file"}
              isOwn={isOwn}
              mediaStorageId={mediaStorageId ?? null}
              mediaIv={mediaIv ?? null}
              mediaOriginalName={mediaOriginalName ?? null}
              mediaDeletedAt={mediaDeletedAt}
            />
          )}

          {type === "text" && (
            <div className="leading-relaxed wrap-break-word pr-6 whitespace-pre-wrap">
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

          {reactions.length > 0 && (
            <div
              className={`absolute -bottom-5 ${isOwn ? "right-2" : "left-2"} flex flex-wrap gap-1 z-10 bg-background dark:bg-sidebar border border-border rounded-full p-0.5 shadow-sm`}
            >
              {Object.entries(
                reactions.reduce(
                  (acc, r) => {
                    if (!acc[r.emoji])
                      acc[r.emoji] = { count: 0, hasMine: false };
                    acc[r.emoji].count += 1;
                    if (r.userId === currentUserId) acc[r.emoji].hasMine = true;
                    return acc;
                  },
                  {} as Record<string, { count: number; hasMine: boolean }>,
                ),
              ).map(([emoji, data]) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmojiSelect(emoji);
                  }}
                  className={`text-[11px] font-medium rounded-full px-1.5 py-0.5 flex items-center gap-1 transition-colors ${
                    data.hasMine
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span>{emoji}</span>
                  {data.count > 1 && <span>{data.count}</span>}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end items-center gap-1 mt-1 -mb-0.5 text-[10.5px] font-medium tracking-wide opacity-70">
            {editedAt && <span>edited</span>}
            {disappearsAt && (
              <svg
                className="w-3 h-3 opacity-70"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 6v6l4 2" />
              </svg>
            )}
            {isStarred && (
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 -mt-px" />
            )}
            {isPinned && (
              <Pin className="w-3 h-3 fill-current text-current opacity-90 -mt-px" />
            )}
            <span>{time}</span>
            {isOwn && (
              <MessageStatusTick isSeen={isSeen} isDelivered={isDelivered} />
            )}
          </div>

          <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <BubbleMenu
              messageId={messageId}
              text={text}
              type={type}
              isOwn={isOwn}
              onSelect={onSelect}
              senderName={isOwn ? "You" : "User"}
              sentAt={sentAt}
              mediaStorageId={mediaStorageId ?? undefined}
              mediaOriginalName={mediaOriginalName ?? undefined}
              isStarred={isStarred}
              isPinned={isPinned}
              conversationId={conversationId}
            />
          </div>
        </div>

        <div
          className={`relative self-center transition-opacity ${showQuickReact || showEmojiPicker ? "z-9999 opacity-100" : "z-20 opacity-0 group-hover:opacity-100"}`}
          ref={emojiPickerRef}
        >
          <button
            onClick={() => {
              if (!showQuickReact) {
                if (emojiPickerRef.current) {
                  const rect = emojiPickerRef.current.getBoundingClientRect();
                  setPickerPosition(rect.top < 150 ? "bottom" : "top");
                }
                setShowQuickReact(true);
                setShowEmojiPicker(false);
              } else {
                setShowQuickReact(false);
              }
            }}
            className={`p-1.5 rounded-full transition-colors ${showQuickReact || showEmojiPicker ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            <Smile size={18} />
          </button>

          {showQuickReact && (
            <div
              className={`absolute ${pickerPosition === "top" ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"} ${isOwn ? `right-0 ${pickerPosition === "top" ? "origin-bottom-right" : "origin-top-right"}` : `left-0 ${pickerPosition === "top" ? "origin-bottom-left" : "origin-top-left"}`} flex items-center gap-1 bg-card text-card-foreground shadow-[0_4px_15px_rgba(0,0,0,0.15)] border border-border/50 rounded-full px-2.5 py-1.5 w-max flex-nowrap z-9999 animate-in zoom-in-75 duration-200`}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="hover:scale-125 transition-transform text-xl px-1.5 shrink-0"
                >
                  {emoji}
                </button>
              ))}
              <div className="w-px h-5 bg-border mx-1 shrink-0" />
              <button
                onClick={() => {
                  if (emojiPickerRef.current) {
                    const rect = emojiPickerRef.current.getBoundingClientRect();
                    setPickerPosition(rect.top < 400 ? "bottom" : "top");
                  }
                  setShowQuickReact(false);
                  setShowEmojiPicker(true);
                }}
                className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground shrink-0"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          {showEmojiPicker && (
            <div
              className={`absolute ${pickerPosition === "top" ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"} ${isOwn ? `right-0 ${pickerPosition === "top" ? "origin-bottom-right" : "origin-top-right"}` : `left-0 ${pickerPosition === "top" ? "origin-bottom-left" : "origin-top-left"}`} z-9999 animate-in zoom-in-75 duration-200`}
            >
              <div
                className={`scale-[0.85] ${pickerPosition === "top" ? "origin-bottom" : "origin-top"} shadow-2xl rounded-xl overflow-hidden border border-border/50`}
              >
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
