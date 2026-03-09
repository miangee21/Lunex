//src/components/chat/media/MediaUploadProgress.tsx
interface MediaUploadProgressProps {
  fileName: string;
  progress: number;
  type: "image" | "video" | "file";
  onCancel?: () => void;
  uploadIndex?: number;
  uploadTotal?: number;
}

export default function MediaUploadProgress({
  fileName,
  progress,
  type,
  onCancel,
  uploadIndex = 1,
  uploadTotal = 1,
}: MediaUploadProgressProps) {
  const icon = type === "image" ? "🖼️" : type === "video" ? "🎥" : "📎";

  return (
    <div className="px-4 py-3 bg-sidebar border-t border-border">
      <div className="flex items-center gap-3 bg-accent rounded-2xl px-4 py-3">
        <span className="text-xl shrink-0">{icon}</span>

        <div className="flex-1 min-w-0">
          {uploadTotal > 1 && (
            <p className="text-xs text-muted-foreground mb-0.5">
              Sending {uploadIndex} of {uploadTotal}
            </p>
          )}
          <p className="text-sm font-semibold text-foreground truncate">
            {fileName}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">
              {progress}%
            </span>
          </div>
        </div>

        {onCancel && progress < 100 && (
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0 text-xs font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
