// src/components/chat/media/MediaPreviewThumbnailBar.tsx
import { FileText, Play, Image as ImageIcon } from "lucide-react";
import { useChatStore } from "@/store/chatStore";

interface ThumbnailItem {
  storageId: string;
  type: "image" | "video" | "file";
  decryptedUrl?: string | null;
}

interface MediaPreviewThumbnailBarProps {
  gallery: ThumbnailItem[];
  safeIndex: number;
  onSelect: (idx: number) => void;
}

export default function MediaPreviewThumbnailBar({
  gallery,
  safeIndex,
  onSelect,
}: MediaPreviewThumbnailBarProps) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);

  return (
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
              onClick={() => onSelect(idx)}
              className={`relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${isActive ? "ring-2 ring-primary scale-110 mx-1 shadow-lg shadow-primary/20" : "opacity-40 hover:opacity-100 scale-95 hover:scale-100"}`}
            >
              {thumbUrl && g.type !== "file" ? (
                g.type === "video" ? (
                  <video
                    src={thumbUrl}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <img src={thumbUrl} className="w-full h-full object-cover" />
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
  );
}
