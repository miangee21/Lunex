import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // ── FIX: Portal import kiya taake direct Global Theme uthaye ──
import { X, Send, Plus, FileText, Play } from "lucide-react";
import { type AllowedFileType } from "@/lib/fileValidation";

interface PreSendMediaPreviewProps {
  files: Array<{ file: File; type: AllowedFileType }>;
  onSend: () => void;
  onCancel: () => void;
  onRemove: (index: number) => void;
  onAddMore: (newFiles: File[]) => void; // ── FIX: Ab yeh direct files return karega ──
}

export default function PreSendMediaPreview({
  files,
  onSend,
  onCancel,
  onRemove,
  onAddMore,
}: PreSendMediaPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [urlMap, setUrlMap] = useState<Map<File, string>>(new Map());

  // ── Smart Memory (Flicker Prevention) ──
  useEffect(() => {
    setUrlMap((prev) => {
      const next = new Map(prev);
      files.forEach((f) => {
        if (!next.has(f.file)) {
          next.set(f.file, URL.createObjectURL(f.file));
        }
      });
      for (const [file, url] of next.entries()) {
        if (!files.find((f) => f.file === file)) {
          URL.revokeObjectURL(url);
          next.delete(file);
        }
      }
      return next;
    });
  }, [files]);

  // Handle out of bounds
  useEffect(() => {
    if (currentIndex >= files.length && files.length > 0) {
      setCurrentIndex(files.length - 1);
    } else if (files.length === 0) {
      onCancel();
    }
  }, [files.length, currentIndex, onCancel]);

  if (files.length === 0) return null;

  const safeIndex = Math.min(currentIndex, files.length - 1);
  const currentItem = files[safeIndex];
  const currentUrl = currentItem ? urlMap.get(currentItem.file) || undefined : undefined;

  // ── Modal UI ──
  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200 text-foreground">
      
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors text-foreground"
        >
          <X size={20} />
        </button>
        <span className="text-foreground font-semibold text-sm">
          {safeIndex + 1} of {files.length} selected
        </span>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* ── MAIN PREVIEW AREA ── */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {currentItem?.type === "image" ? (
          <img src={currentUrl} alt="preview" className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
        ) : currentItem?.type === "video" ? (
          <video src={currentUrl} controls className="max-w-full max-h-full rounded-xl shadow-lg" />
        ) : (
          <div className="flex flex-col items-center gap-4 bg-accent/50 p-10 rounded-3xl">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText size={40} className="text-primary" />
            </div>
            <p className="text-foreground font-semibold text-lg max-w-[200px] text-center truncate">
              {currentItem?.file.name}
            </p>
            <p className="text-muted-foreground text-sm">
              {((currentItem?.file.size || 0) / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        )}
      </div>

      {/* ── BOTTOM THUMBNAIL STRIP & SEND ── */}
      <div className="p-4 bg-card border-t border-border flex items-center gap-4">
        
        {/* Thumbnails */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
          {files.map((item, idx) => (
            <div 
              key={idx} 
              className={`relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all ${
                safeIndex === idx ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-105" : "opacity-60 hover:opacity-100"
              }`}
              onClick={() => setCurrentIndex(idx)}
            >
              {item.type === "image" && (
                <img src={urlMap.get(item.file)} className="w-full h-full object-cover" />
              )}
              {item.type === "video" && (
                <div className="w-full h-full bg-black/80 flex items-center justify-center">
                  <Play size={16} fill="white" className="text-white" />
                </div>
              )}
              {item.type === "file" && (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <FileText size={16} className="text-primary" />
                </div>
              )}

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(idx);
                }}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-destructive transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {/* ── FIX: Self-contained Add More Button ── */}
          {files.length < 10 && (
            <label className="w-14 h-14 flex-shrink-0 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors ml-1 cursor-pointer">
              <Plus size={24} />
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddMore(Array.from(e.target.files));
                    e.target.value = ""; // reset input
                  }
                }}
              />
            </label>
          )}
        </div>

        {/* Send Button */}
        <button 
          onClick={onSend}
          className="w-14 h-14 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl hover:opacity-90 transition-all hover:scale-105 ml-auto"
        >
          <Send size={22} className="ml-1" />
        </button>

      </div>
    </div>
  );

  // ── FIX: Portal lagaya taake app ki main body (jahan Global Theme hai) usme render ho ──
  return createPortal(modalContent, document.body);
}