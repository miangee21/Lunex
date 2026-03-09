// src/components/chat/media/MediaPreview.tsx
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useChatStore } from "@/store/chatStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Download, FileText } from "lucide-react";
import MediaPreviewToolbar from "@/components/chat/media/MediaPreviewToolbar";
import MediaPreviewGallery from "@/components/chat/media/MediaPreviewGallery";
import MediaPreviewThumbnailBar from "@/components/chat/media/MediaPreviewThumbnailBar";
import { toast } from "sonner";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";

interface MediaPreviewProps {
  storageId: string;
  messageId?: string;
  text?: string;
  isOwn?: boolean;
  decryptedUrl?: string | null;
  type: "image" | "video" | "file";
  originalName?: string | null;
  mediaIv?: string | null;
  secretKey?: any;
  theirPublicKey?: any;
  onClose: () => void;
  isStarred?: boolean;
  isPinned?: boolean;
  conversationId?: string;
  gallery?: Array<{
    storageId: string;
    messageId?: string;
    text?: string;
    isOwn?: boolean;
    type: "image" | "video" | "file";
    originalName?: string | null;
    mediaIv?: string | null;
    isStarred?: boolean;
    isPinned?: boolean;
    decryptedUrl?: string | null;
  }>;
  galleryIndex?: number;
}

export default function MediaPreview({
  storageId: initialStorageId,
  messageId: initialMessageId,
  text: initialText,
  isOwn: initialIsOwn,
  type: initialType,
  originalName: initialOriginalName,
  mediaIv: initialMediaIv,
  decryptedUrl: initialDecryptedUrl,
  secretKey,
  theirPublicKey,
  onClose,
  isStarred: initialIsStarred = false,
  isPinned: initialIsPinned = false,
  conversationId,
  gallery = [],
  galleryIndex = 0,
}: MediaPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(galleryIndex);

  const localMediaCache = useChatStore((s) => s.localMediaCache);
  const setSelectedMessageForInfo = useChatStore(
    (s) => s.setSelectedMessageForInfo,
  );
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const activeChat = useChatStore((s) => s.activeChat);

  const isGallery = gallery.length > 1;
  const safeIndex =
    currentIndex >= gallery.length
      ? Math.max(0, gallery.length - 1)
      : currentIndex;

  useEffect(() => {
    if (currentIndex >= gallery.length && gallery.length > 0) {
      setCurrentIndex(gallery.length - 1);
    } else if (isGallery && gallery.length === 0) {
      onClose();
    }
  }, [gallery.length, currentIndex, isGallery, onClose]);

  const currentItem =
    isGallery && gallery.length > 0
      ? gallery[safeIndex]
      : {
          storageId: initialStorageId,
          messageId: initialMessageId,
          text: initialText,
          isOwn: initialIsOwn,
          decryptedUrl: initialDecryptedUrl,
          type: initialType,
          originalName: initialOriginalName,
          mediaIv: initialMediaIv,
          isStarred: initialIsStarred,
          isPinned: initialIsPinned,
        };

  const [localDecryptedUrl, setLocalDecryptedUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setLocalDecryptedUrl(null);
    setZoom(1);
    setRotation(0);
  }, [safeIndex]);

  if (!currentItem) return null;

  const shouldFetchUrl = !currentItem.decryptedUrl && currentItem.storageId;

  const fetchedUrl = useQuery(
    api.media.getFileUrl,
    shouldFetchUrl
      ? { storageId: currentItem.storageId as Id<"_storage"> }
      : "skip",
  );

  useEffect(() => {
    if (
      fetchedUrl &&
      currentItem.mediaIv &&
      secretKey &&
      theirPublicKey &&
      !currentItem.decryptedUrl
    ) {
      let isMounted = true;
      async function decrypt() {
        try {
          const mimeType = getMimeTypeFromName(currentItem.originalName ?? "");
          const url = await decryptMediaFile(
            fetchedUrl!,
            currentItem.mediaIv!,
            secretKey!,
            theirPublicKey!,
            mimeType,
          );
          if (isMounted) setLocalDecryptedUrl(url);
        } catch (err) {
          console.error("Gallery decryption failed", err);
        }
      }
      decrypt();
      return () => {
        isMounted = false;
      };
    }
  }, [fetchedUrl, currentItem, secretKey, theirPublicKey]);

  const cachedUrl = currentItem.storageId
    ? localMediaCache[currentItem.storageId]
    : null;
  const fileUrl =
    currentItem.decryptedUrl ??
    localDecryptedUrl ??
    cachedUrl ??
    (!currentItem.mediaIv ? fetchedUrl : null);

  function goPrev() {
    setZoom(1);
    setRotation(0);
    setCurrentIndex((i) => (i - 1 + gallery.length) % gallery.length);
  }

  function goNext() {
    setZoom(1);
    setRotation(0);
    setCurrentIndex((i) => (i + 1) % gallery.length);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (isGallery && e.key === "ArrowLeft") goPrev();
      if (isGallery && e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, isGallery, currentIndex, gallery.length]);

  async function handleDownload() {
    if (!fileUrl) return;
    const originalName = currentItem.originalName || "media";
    const extMatch = originalName.match(/\.([^.]+)$/);
    const ext = extMatch
      ? extMatch[1]
      : currentItem.type === "image"
        ? "jpg"
        : currentItem.type === "video"
          ? "mp4"
          : "bin";
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `lunex_${Date.now()}_${randomStr}.${ext}`;
    try {
      const filePath = await save({
        defaultPath: fileName,
        title: "Save Media File",
      });
      if (!filePath) return;
      const toastId = toast.loading("Saving file...");
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await writeFile(filePath, uint8Array);
      toast.success("File saved successfully!", { id: toastId });
    } catch (error: any) {
      console.error("Native save failed:", error);
      toast.error(`Save Failed: ${error.message || error}`);
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  function showInfo() {
    if (currentItem.messageId) {
      setSelectedMessageForInfo({
        id: currentItem.messageId,
        text: currentItem.text || currentItem.originalName || "",
        type: currentItem.type,
        mediaStorageId: currentItem.storageId,
        mediaIv: currentItem.mediaIv,
        mediaOriginalName: currentItem.originalName,
        cameFromPreview: true,
      });
      onClose();
    } else {
      toast(`File Info`, {
        description: `Name: ${currentItem.originalName || "Unknown"}\nType: ${currentItem.type.toUpperCase()}\nStatus: Sent`,
      });
    }
  }

  function handleReply() {
    if (currentItem.messageId) {
      setReplyingTo({
        id: currentItem.messageId,
        text: currentItem.originalName || "Media",
        senderName: currentItem.isOwn ? "You" : activeChat?.username || "User",
        type: currentItem.type,
        mediaStorageId: currentItem.storageId,
      });
      onClose();
    }
  }

  function handleDelete() {
    if (currentItem.messageId) {
      window.dispatchEvent(
        new CustomEvent("open-delete-modal-for-single", {
          detail: { id: currentItem.messageId },
        }),
      );
      onClose();
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200"
      onClick={onClose}
    >
      <MediaPreviewToolbar
        originalName={currentItem.originalName}
        type={currentItem.type}
        isOwn={currentItem.isOwn}
        isStarred={currentItem.isStarred}
        isPinned={currentItem.isPinned}
        messageId={currentItem.messageId}
        conversationId={conversationId}
        zoom={zoom}
        isGallery={isGallery}
        safeIndex={safeIndex}
        galleryTotal={gallery.length}
        onZoomIn={() => setZoom((z) => Math.min(3, z + 0.25))}
        onZoomOut={() => setZoom((z) => Math.max(0.5, z - 0.25))}
        onRotate={() => setRotation((r) => (r + 90) % 360)}
        onDownload={handleDownload}
        onReply={handleReply}
        onInfo={showInfo}
        onDelete={handleDelete}
        onClose={onClose}
      />

      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {!fileUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
            <span className="text-white/60 text-sm font-medium tracking-wide animate-pulse">
              Loading preview...
            </span>
          </div>
        ) : currentItem.type === "image" ? (
          <img
            src={fileUrl}
            alt="image"
            className="max-w-full max-h-full object-contain transition-all duration-300 select-none"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            draggable={false}
          />
        ) : currentItem.type === "video" ? (
          <video
            src={fileUrl}
            controls
            autoPlay
            className={`max-w-[90%] rounded-2xl shadow-2xl ring-1 ring-white/10 ${isGallery ? "max-h-[70vh] mb-24" : "max-h-[85vh]"}`}
          />
        ) : (
          <div className="flex flex-col items-center gap-5 bg-white/5 p-10 rounded-3xl backdrop-blur-md ring-1 ring-white/10 shadow-2xl">
            <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center">
              <FileText size={48} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-xl max-w-62.5 truncate mb-1">
                {currentItem.originalName ?? "Document"}
              </p>
              <p className="text-white/50 text-sm">Secure File</p>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 mt-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25"
            >
              <Download size={20} /> Download File
            </button>
          </div>
        )}

        <MediaPreviewGallery
          total={gallery.length}
          onPrev={goPrev}
          onNext={goNext}
        />
      </div>

      {isGallery && (
        <MediaPreviewThumbnailBar
          gallery={gallery}
          safeIndex={safeIndex}
          onSelect={(idx) => {
            setCurrentIndex(idx);
            setZoom(1);
            setRotation(0);
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
