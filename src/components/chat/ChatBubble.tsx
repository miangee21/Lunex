//src/components/chat/ChatBubble.tsx
import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import MessageStatusTick from "@/components/chat/MessageStatusTick";
import BubbleMenu from "@/components/chat/BubbleMenu";
import BubbleMedia from "@/components/chat/BubbleMedia";

import EmojiPicker from "@/components/chat/EmojiPicker";
import { Smile, Plus, Play } from "lucide-react";
import { toast } from "sonner";
import { useChatStore } from "@/store/chatStore";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";

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
  replyToMessage?: { id: string; text: string; senderName: string; type: string; mediaStorageId?: string | null; } | null;
  sentAt?: number;
  secretKey?: Uint8Array | null; // ── FIX: String ki jagah asal type likh di ──
  otherUserPublicKey?: string;
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
  reactions = [],
  editedAt = null,
  readBy = [],
  deliveredTo = [],
  otherUserId,
  onSelect,
  replyToMessage = null,
  sentAt = 0, 
  secretKey,
  otherUserPublicKey,
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickReact, setShowQuickReact] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const isMedia = type !== "text";
  const currentUserId = useAuthStore((s) => s.userId);
  const localMediaCache = useChatStore((s) => s.localMediaCache); // ── FIX: Thumbnail URL Cache ──
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
        // ── FIX: REACTION KO FULLY ENCRYPT KIYA ──
        const theirPublicKeyBytes = base64ToKey(otherUserPublicKey);
        const { encryptedContent, iv } = encryptMessage(emoji, secretKey, theirPublicKeyBytes); // ── FIX: secretKey direct pass ki ──

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

  // ── FIX: Scroll to Original Message Logic ──
  const handleScrollToOriginal = () => {
    if (!replyToMessage?.id) return;

    // ── FIX: Agar Media File hai toh sidha uski Preview Open kar do ──
    if (replyToMessage.type !== "text") {
      window.dispatchEvent(new CustomEvent("reopen-preview", { detail: { id: replyToMessage.id } }));
    }

    const element = document.getElementById(`message-${replyToMessage.id}`) || document.getElementById(`wrap-${replyToMessage.id}`);
    
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-primary", "bg-primary/20", "scale-[1.02]");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary", "bg-primary/20", "scale-[1.02]");
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

  return (
    <div
      id={`message-${messageId}`} // ── FIX: ID add ki taake target ho sakay ──
      className={`flex w-full group py-1.5 transition-all duration-500 rounded-lg ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative flex max-w-[75%] md:max-w-[65%] items-start gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          // ── FIX: Agar reply hai toh parent pe minimum 120px width lagayi ──
          className={`relative flex flex-col px-4 pt-2.5 pb-2 rounded-2xl shadow-sm text-[15px] transition-all duration-200 ${replyToMessage ? "min-w-30" : ""} ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary border border-border/50 text-secondary-foreground rounded-bl-sm"}`}
        >
          {/* ── REPLY QUOTED BUBBLE (100% ACCURATE SHRINK-WRAP FIX) ── */}
          {replyToMessage && (
            <div 
              onClick={handleScrollToOriginal}
              className={`mb-1.5 px-2.5 py-1.5 rounded-lg text-sm border-l-4 opacity-90 overflow-hidden cursor-pointer hover:opacity-100 transition-opacity flex flex-row items-center gap-2 w-0 min-w-full ${isOwn ? "bg-primary-foreground/20 border-primary-foreground text-primary-foreground" : "bg-primary/10 border-primary text-foreground"}`}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <p className="font-bold text-[12px] truncate mb-0.5 w-full">{replyToMessage.senderName}</p>
                <p className={`opacity-80 text-[11px] leading-tight line-clamp-2 wrap-break-word whitespace-pre-wrap w-full ${(!replyToMessage.text && !replyToMessage.mediaStorageId) ? "italic opacity-60" : ""}`}>
                  {(!replyToMessage.text && !replyToMessage.mediaStorageId) 
                    ? "🚫 This message was deleted" 
                    : (replyToMessage.type === "text" ? replyToMessage.text : `Attachment: ${replyToMessage.type}`)
                  }
                </p>
              </div>
              
              {/* ── FIX: Thumbnail sirf tab dikhao jab message deleted na ho ── */}
              {replyToMessage.mediaStorageId && replyToMessage.text !== "" && localMediaCache[replyToMessage.mediaStorageId] && replyToMessage.type !== "file" && replyToMessage.type !== "audio" && (
                <div className="relative w-9 h-9 rounded bg-black/10 shrink-0 overflow-hidden border border-border/50">
                  {replyToMessage.type === "video" ? (
                    <>
                      <video src={localMediaCache[replyToMessage.mediaStorageId]} className="w-full h-full object-cover pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play size={10} fill="white" className="text-white" />
                      </div>
                    </>
                  ) : (
                    <img src={localMediaCache[replyToMessage.mediaStorageId]} className="w-full h-full object-cover pointer-events-none" alt="thumb" />
                  )}
                </div>
              )}
            </div>
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
              // ── FIX: Ye 2 lines add ki taake menu me download chal sake ── 
              mediaStorageId={mediaStorageId ?? undefined}
              mediaOriginalName={mediaOriginalName ?? undefined}
            />
          </div>
        </div>

        <div
          className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
          ref={emojiPickerRef}
        >
          <button
            onClick={() => {
              setShowQuickReact(!showQuickReact);
              setShowEmojiPicker(false);
            }}
            className="p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground rounded-full transition-colors"
          >
            <Smile size={18} />
          </button>

          {showQuickReact && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? "right-full mr-1" : "left-full ml-1"} flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border shadow-xl rounded-full px-2 py-1.5 z-60`}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="hover:scale-125 transition-transform text-xl px-1"
                >
                  {emoji}
                </button>
              ))}
              <div className="w-px h-5 bg-border mx-1" />
              <button
                onClick={() => {
                  setShowQuickReact(false);
                  setShowEmojiPicker(true);
                }}
                className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          {showEmojiPicker && (
            <div
              className={`absolute z-70 ${isOwn ? "right-full mr-2 top-0" : "left-full ml-2 top-0"}`}
            >
              <div className="scale-[0.80] md:scale-90 origin-top shadow-2xl rounded-xl">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
