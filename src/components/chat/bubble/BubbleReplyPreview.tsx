// src/components/chat/bubble/BubbleReplyPreview.tsx
import { Play } from "lucide-react";
import { useChatStore } from "@/store/chatStore";

interface ReplyToMessage {
  id: string;
  text: string;
  senderName: string;
  type: string;
  mediaStorageId?: string | null;
}

interface BubbleReplyPreviewProps {
  replyToMessage: ReplyToMessage;
  isOwn: boolean;
  onScrollToOriginal: () => void;
}

export default function BubbleReplyPreview({
  replyToMessage,
  isOwn,
  onScrollToOriginal,
}: BubbleReplyPreviewProps) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);

  return (
    <div
      onClick={onScrollToOriginal}
      className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-xl cursor-pointer transition-opacity hover:opacity-80 ${
        isOwn
          ? "bg-white/10 border-l-2 border-white/40"
          : "bg-black/5 border-l-2 border-primary/40"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`text-[11px] font-semibold mb-0.5 truncate ${
            isOwn ? "text-white/80" : "text-primary"
          }`}
        >
          {replyToMessage.senderName}
        </p>
        <p
          className={`text-[12px] truncate ${
            isOwn ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          {replyToMessage.type !== "text"
            ? replyToMessage.type === "image"
              ? "📷 Photo"
              : replyToMessage.type === "video"
                ? "🎥 Video"
                : "📎 File"
            : replyToMessage.text}
        </p>
      </div>

      {replyToMessage.mediaStorageId &&
        replyToMessage.type !== "file" &&
        replyToMessage.type !== "audio" && (
          <div className="relative w-9 h-9 rounded bg-black/10 shrink-0 overflow-hidden border border-border/50">
            {replyToMessage.type === "video" ? (
              <>
                <video
                  src={localMediaCache[replyToMessage.mediaStorageId]}
                  className="w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play size={10} fill="white" className="text-white" />
                </div>
              </>
            ) : (
              <img
                src={localMediaCache[replyToMessage.mediaStorageId]}
                className="w-full h-full object-cover pointer-events-none"
                alt="thumb"
              />
            )}
          </div>
        )}
    </div>
  );
}
