//src/components/chat/ChatBubble.tsx
import { useState } from "react";
import MessageStatusTick from "@/components/chat/MessageStatusTick";
import BubbleMenu from "@/components/chat/BubbleMenu";
import BubbleMedia from "@/components/chat/BubbleMedia";

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
  const isMedia = type !== "text";

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
      className={`flex w-full group py-1.5 ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative flex max-w-[75%] md:max-w-[65%] items-start gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`relative px-4 pt-2.5 pb-2 rounded-2xl shadow-sm text-[15px] transition-all duration-200 ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary border border-border/50 text-secondary-foreground rounded-bl-sm"}`}
        >
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
