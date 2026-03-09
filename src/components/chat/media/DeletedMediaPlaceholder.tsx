//src/components/chat/media/DeletedMediaPlaceholder.tsx
import { ImageOff, VideoOff, FileX, LayoutGrid } from "lucide-react";

interface DeletedMediaPlaceholderProps {
  type: "image" | "video" | "file" | "grid";
  isOwn: boolean;
}

export default function DeletedMediaPlaceholder({
  type,
  isOwn,
}: DeletedMediaPlaceholderProps) {
  const Icon =
    type === "image"
      ? ImageOff
      : type === "video"
        ? VideoOff
        : type === "grid"
          ? LayoutGrid
          : FileX;

  const label =
    type === "image"
      ? "Image expired"
      : type === "video"
        ? "Video expired"
        : type === "grid"
          ? "Grid expired"
          : "File expired";
  const sublabel = "Media is automatically deleted after 6 hours";

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center gap-3
        w-55 h-35 sm:w-65 sm:h-45
        rounded-2xl mb-1 overflow-hidden
        border border-dashed
        ${
          isOwn
            ? "bg-primary-foreground/5 border-primary-foreground/20"
            : "bg-muted/40 border-border"
        }
      `}
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,currentColor,currentColor 1px,transparent 1px,transparent 12px),repeating-linear-gradient(90deg,currentColor,currentColor 1px,transparent 1px,transparent 12px)",
        }}
      />

      <div
        className={`
          relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center
          ${isOwn ? "bg-primary-foreground/10" : "bg-muted-foreground/10"}
        `}
      >
        <Icon
          size={22}
          className={
            isOwn ? "text-primary-foreground/50" : "text-muted-foreground/60"
          }
          strokeWidth={1.5}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-0.5 px-4 text-center">
        <p
          className={`text-[13px] font-semibold leading-tight ${
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        <p
          className={`text-[10px] leading-tight max-w-35 ${
            isOwn ? "text-primary-foreground/35" : "text-muted-foreground/60"
          }`}
        >
          {sublabel}
        </p>
      </div>
    </div>
  );
}
