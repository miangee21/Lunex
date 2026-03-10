// src/components/chat/media/MediaPreviewToolbar.tsx
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Info,
  CornerDownLeft,
  Trash2,
  Star,
  Pin,
} from "lucide-react";

interface MediaPreviewToolbarProps {
  originalName?: string | null;
  type: "image" | "video" | "file";
  isOwn?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  messageId?: string;
  conversationId?: string;
  zoom: number;
  isGallery: boolean;
  safeIndex: number;
  galleryTotal: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onDownload: () => void;
  onReply: () => void;
  onInfo: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function MediaPreviewToolbar({
  originalName,
  type,
  isOwn,
  isStarred: initialIsStarred,
  isPinned: initialIsPinned,
  messageId,
  conversationId,
  zoom,
  isGallery,
  safeIndex,
  galleryTotal,
  onZoomIn,
  onZoomOut,
  onRotate,
  onDownload,
  onReply,
  onInfo,
  onDelete,
  onClose,
}: MediaPreviewToolbarProps) {
  const userId = useAuthStore((s) => s.userId);
  const toggleStarMessage = useMutation(api.messages.toggleStarMessage);
  const togglePinMessage = useMutation(api.messages.togglePinMessage);
  const [isStarred, setIsStarred] = useState(initialIsStarred ?? false);
  const [isPinned, setIsPinned] = useState(initialIsPinned ?? false);

  useEffect(() => {
    setIsStarred(initialIsStarred ?? false);
    setIsPinned(initialIsPinned ?? false);
  }, [initialIsStarred, initialIsPinned]);

  const handleToggleStar = async () => {
    if (!userId || !messageId) return;
    try {
      setIsStarred((s) => !s);
      await toggleStarMessage({
        messageId: messageId as Id<"messages">,
        userId: userId as Id<"users">,
      });
    } catch {
      setIsStarred((s) => !s);
      toast.error("Failed to update star status");
    }
  };

  const handleTogglePin = async () => {
    if (!conversationId || !messageId) return;
    try {
      setIsPinned((p) => !p);
      await togglePinMessage({
        messageId: messageId as Id<"messages">,
        conversationId: conversationId as Id<"conversations">,
      });
    } catch (error: any) {
      setIsPinned((p) => !p);
      if (error.message?.includes("3 messages")) {
        toast.error("You can only pin up to 3 messages in a chat.");
      } else {
        toast.error("Failed to pin message.");
      }
    }
  };

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 bg-linear-to-b from-black/80 to-transparent z-20 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col">
          <p className="text-white/90 text-sm font-semibold truncate max-w-50 sm:max-w-xs drop-shadow-md">
            {originalName ?? "Media"}
          </p>
          {isGallery && (
            <span className="text-white/60 text-[11px] font-medium tracking-wider">
              {safeIndex + 1} OF {galleryTotal}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={handleToggleStar}
          className={`p-2.5 rounded-full transition-colors ${isStarred ? "text-yellow-400 bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
          title="Star"
        >
          <Star size={18} className={isStarred ? "fill-yellow-400" : ""} />
        </button>

        {conversationId && (
          <button
            onClick={handleTogglePin}
            className={`p-2.5 rounded-full transition-colors ${isPinned ? "text-primary bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
            title="Pin"
          >
            <Pin size={18} className={isPinned ? "fill-primary" : ""} />
          </button>
        )}

        <button
          onClick={onReply}
          className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Reply"
        >
          <CornerDownLeft size={18} />
        </button>

        {isOwn && (
          <button
            onClick={onInfo}
            className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="File Info"
          >
            <Info size={18} />
          </button>
        )}

        <button
          onClick={onDelete}
          className="p-2.5 rounded-full text-white/70 hover:text-red-400 hover:bg-white/10 transition-colors"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>

        {type === "image" && (
          <div className="hidden sm:flex items-center gap-1 mr-2 border-r border-white/20 pr-3">
            <button
              onClick={onZoomOut}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-white/70 text-xs w-10 text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={onRotate}
              className="p-2 ml-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Rotate"
            >
              <RotateCw size={18} />
            </button>
          </div>
        )}

        <button
          onClick={onDownload}
          className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Download"
        >
          <Download size={18} />
        </button>

        <button
          onClick={onClose}
          className="p-2.5 rounded-full text-white/70 hover:text-red-400 hover:bg-white/10 transition-colors ml-1"
          title="Close"
        >
          <X size={22} />
        </button>
      </div>
    </div>
  );
}
