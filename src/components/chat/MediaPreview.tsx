//src/components/chat/MediaPreview.tsx
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useChatStore } from "@/store/chatStore";
import { toast } from "sonner";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Info,
  Image as ImageIcon,
  FileText,
  Play,
} from "lucide-react";

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
  gallery?: Array<{
    storageId: string;
    messageId?: string;
    text?: string;
    isOwn?: boolean;
    decryptedUrl?: string | null;
    type: "image" | "video" | "file";
    originalName?: string | null;
    mediaIv?: string | null;
  }>;
  galleryIndex?: number;
}

export default function MediaPreview({
  storageId,
  messageId,
  text,
  isOwn,
  decryptedUrl,
  type,
  originalName,
  mediaIv,
  secretKey,
  theirPublicKey,
  onClose,
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
          storageId,
          messageId,
          text,
          isOwn,
          decryptedUrl,
          type,
          originalName,
          mediaIv,
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
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = currentItem.originalName ?? "lunex-media";
    if (!currentItem.decryptedUrl) a.target = "_blank";
    a.click();
    toast.success(`${currentItem.originalName ?? "File"} downloading started!`);
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
        icon: <Info size={16} />,
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ── HEADER ── */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 bg-linear-to-b from-black/80 to-transparent z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col">
            <p className="text-white/90 text-sm font-semibold truncate max-w-50 sm:max-w-xs drop-shadow-md">
              {currentItem.originalName ?? "Media"}
            </p>
            {isGallery && (
              <span className="text-white/60 text-[11px] font-medium tracking-wider">
                {safeIndex + 1} OF {gallery.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {currentItem.isOwn && (
            <button
              onClick={showInfo}
              className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="File Info"
            >
              <Info size={18} />
            </button>
          )}

          {currentItem.type === "image" && (
            <div className="hidden sm:flex items-center gap-1 mr-2 border-r border-white/20 pr-3">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white/70 text-xs w-10 text-center font-medium">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 ml-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Rotate"
              >
                <RotateCw size={18} />
              </button>
            </div>
          )}

          <button
            onClick={handleDownload}
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

        {isGallery && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 hover:scale-110 flex items-center justify-center text-white transition-all backdrop-blur-md sm:flex border border-white/10"
            >
              <svg
                className="w-6 h-6 mr-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 hover:scale-110 flex items-center justify-center text-white transition-all backdrop-blur-md sm:flex border border-white/10"
            >
              <svg
                className="w-6 h-6 ml-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {isGallery && (
        <div
          className="absolute bottom-6 left-0 right-0 flex justify-center px-4 z-20 pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl max-w-full no-scrollbar pointer-events-auto shadow-2xl">
            {gallery.map((g, idx) => {
              const isActive = idx === safeIndex;
              const thumbUrl =
                g.decryptedUrl ||
                (g.storageId ? localMediaCache[g.storageId] : null);

              return (
                <div
                  key={g.storageId || idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoom(1);
                    setRotation(0);
                  }}
                  className={`relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${isActive ? "ring-2 ring-primary scale-110 mx-1 shadow-lg shadow-primary/20" : "opacity-40 hover:opacity-100 scale-95 hover:scale-100"}`}
                >
                  {thumbUrl && g.type !== "file" ? (
                    g.type === "video" ? (
                      <video
                        src={thumbUrl}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <img
                        src={thumbUrl}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center">
                      {g.type === "file" ? (
                        <FileText size={20} className="text-white/70" />
                      ) : g.type === "video" ? (
                        <Play size={20} className="text-white/70" />
                      ) : (
                        <ImageIcon size={20} className="text-white/70" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
