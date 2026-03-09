//src/components/chat/bubble/ReplyPreview.tsx
import { useChatStore } from "@/store/chatStore";
import {
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Headphones,
  Play,
} from "lucide-react";

export default function ReplyPreview() {
  const { replyingTo, setReplyingTo, activeChat, localMediaCache } =
    useChatStore();

  if (!replyingTo) return null;
  const accentColor = activeChat?.myBubbleColor || "hsl(var(--primary))";

  const thumbUrl = replyingTo.mediaStorageId
    ? localMediaCache[replyingTo.mediaStorageId]
    : null;

  const renderIcon = () => {
    switch (replyingTo.type) {
      case "image":
        return <ImageIcon size={14} className="inline mr-1 opacity-70" />;
      case "video":
        return <Video size={14} className="inline mr-1 opacity-70" />;
      case "audio":
        return <Headphones size={14} className="inline mr-1 opacity-70" />;
      case "file":
        return <FileText size={14} className="inline mr-1 opacity-70" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur-sm border-t border-border shadow-sm mb-2 rounded-xl overflow-hidden mx-4">
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex-1 min-w-0 pl-2">
        <p
          className="text-xs font-bold truncate"
          style={{ color: accentColor }}
        >
          {replyingTo.senderName}
        </p>
        <div className="flex items-center mt-0.5 text-sm text-muted-foreground">
          {renderIcon()}
          <p className="truncate flex-1 min-w-0">
            {replyingTo.type === "text"
              ? replyingTo.text
              : `${replyingTo.type.charAt(0).toUpperCase() + replyingTo.type.slice(1)}`}
          </p>
        </div>
      </div>

      {thumbUrl &&
        replyingTo.type !== "file" &&
        replyingTo.type !== "audio" && (
          <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 ml-3 bg-black/10 border border-border/50 shadow-sm">
            {replyingTo.type === "video" ? (
              <>
                <video
                  src={thumbUrl}
                  className="w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play size={12} fill="white" className="text-white" />
                </div>
              </>
            ) : (
              <img
                src={thumbUrl}
                className="w-full h-full object-cover pointer-events-none"
                alt="thumb"
              />
            )}
          </div>
        )}

      <button
        onClick={() => setReplyingTo(null)}
        className="w-7 h-7 flex shrink-0 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors ml-3"
      >
        <X size={16} />
      </button>
    </div>
  );
}
