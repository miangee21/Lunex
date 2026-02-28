import { useState, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface MediaPreviewProps {
  storageId: string;
  decryptedUrl?: string | null;
  type: "image" | "video" | "file";
  originalName?: string | null;
  onClose: () => void;
  gallery?: Array<{
    storageId: string;
    decryptedUrl?: string | null;
    type: "image" | "video" | "file";
    originalName?: string | null;
  }>;
  galleryIndex?: number;
}

export default function MediaPreview({
  storageId,
  decryptedUrl,
  type,
  originalName,
  onClose,
  gallery = [],
  galleryIndex = 0,
}: MediaPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(galleryIndex);

  const isGallery = gallery.length > 1;
  const currentItem = isGallery
    ? gallery[currentIndex]
    : { storageId, decryptedUrl, type, originalName };

  // ── Agar decryptedUrl already available hai to query mat karo ──
  const shouldFetchUrl = !currentItem.decryptedUrl;
  const fetchedUrl = useQuery(
    api.media.getFileUrl,
    shouldFetchUrl
      ? { storageId: currentItem.storageId as Id<"_storage"> }
      : "skip"
  );

  // ── Final URL — decrypted prefer karo ──
  const fileUrl = currentItem.decryptedUrl ?? fetchedUrl;

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

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (isGallery && e.key === "ArrowLeft") goPrev();
      if (isGallery && e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, isGallery, currentIndex]);

  async function handleDownload() {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = currentItem.originalName ?? "lunex-media";
    if (!currentItem.decryptedUrl) a.target = "_blank";
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/40 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isGallery && (
            <span className="text-white/50 text-xs flex-shrink-0">
              {currentIndex + 1} / {gallery.length}
            </span>
          )}
          <p className="text-white/80 text-sm font-medium truncate max-w-xs">
            {currentItem.originalName ?? "Media"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Image controls */}
          {type === "image" && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white/60 text-xs w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Rotate"
              >
                <RotateCw size={18} />
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {!fileUrl ? (
          <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : currentItem.type === "image" ? (
          <img
            src={fileUrl}
            alt={currentItem.originalName ?? "image"}
            className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        ) : currentItem.type === "video" ? (
          <video
            src={fileUrl}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg text-center max-w-xs truncate">
              {currentItem.originalName ?? "Document"}
            </p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:opacity-90 transition-opacity"
            >
              <Download size={18} />
              Download
            </button>
          </div>
        )}

        {/* ── Gallery Navigation Arrows ── */}
        {isGallery && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}