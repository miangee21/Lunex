// src/components/chat/media/MediaPreviewGallery.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MediaPreviewGalleryProps {
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function MediaPreviewGallery({
  total,
  onPrev,
  onNext,
}: MediaPreviewGalleryProps) {
  if (total <= 1) return null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-105 shadow-xl border border-white/10"
        title="Previous"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-105 shadow-xl border border-white/10"
        title="Next"
      >
        <ChevronRight size={22} />
      </button>
    </>
  );
}
