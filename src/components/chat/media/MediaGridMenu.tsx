// src/components/chat/media/MediaGridMenu.tsx
import { useChatStore } from "@/store/chatStore";
import { toast } from "sonner";
import { open } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Download, CheckSquare, Trash2 } from "lucide-react";

interface MediaGridMenuProps {
  group: any[];
  msg: any;
  isGroupOwn: boolean;
  mediaDeletedAt?: number | null;
  onSelectGrid: () => void;
  onDeleteClick: () => void;
  onClose: () => void;
  setForceDownload: (val: boolean) => void;
}

export default function MediaGridMenu({
  group,
  mediaDeletedAt,
  onSelectGrid,
  onDeleteClick,
  onClose,
  setForceDownload,
}: MediaGridMenuProps) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);

  const handleDownloadAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();

    let missingFiles = false;
    group.forEach((m: any) => {
      if (m.mediaStorageId && !localMediaCache[m.mediaStorageId])
        missingFiles = true;
    });

    if (missingFiles) {
      setForceDownload(true);
      toast.info(
        "Decrypting secure files... Please click Download All again in a moment.",
      );
      return;
    }

    const toastId = toast.loading(`Saving ${group.length} files...`);

    try {
      const selectedDirPath = await open({
        directory: true,
        multiple: false,
        title: "Select folder to save media files",
      });

      if (!selectedDirPath) {
        toast.dismiss(toastId);
        return;
      }

      const separator = (selectedDirPath as string).includes("\\") ? "\\" : "/";

      for (let i = 0; i < group.length; i++) {
        const m = group[i];
        if (m.mediaStorageId && localMediaCache[m.mediaStorageId]) {
          const url = localMediaCache[m.mediaStorageId];
          const originalName = m.mediaOriginalName || "";
          const extMatch = originalName.match(/\.([^.]+)$/);
          const ext = extMatch
            ? extMatch[1]
            : m.type === "image"
              ? "jpg"
              : m.type === "video"
                ? "mp4"
                : "bin";
          const randomStr = Math.random().toString(36).substring(2, 8);
          const fileName = `lunex_${Date.now()}_${randomStr}.${ext}`;
          const filePath = `${selectedDirPath}${separator}${fileName}`;
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          await writeFile(filePath, uint8Array);
        }
      }

      toast.success("All files saved successfully!", { id: toastId });
    } catch (error: any) {
      console.error("Native download failed:", error);
      toast.error(`Save Failed: ${error.message || error}`, {
        id: toastId,
        duration: 8000,
      });
      group.forEach((m: any, index: number) => {
        if (m.mediaStorageId && localMediaCache[m.mediaStorageId]) {
          setTimeout(() => {
            const a = document.createElement("a");
            a.href = localMediaCache[m.mediaStorageId];
            a.download = m.mediaOriginalName || `lunex-media-${index + 1}`;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, index * 500);
        }
      });
    }
  };

  return (
    <div className="absolute top-9 right-2 w-48 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95">
      {!mediaDeletedAt && (
        <>
          <button
            onClick={handleDownloadAll}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors"
          >
            <Download size={14} className="text-muted-foreground" />
            Download All
          </button>
          <div className="h-px bg-border w-full" />
        </>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelectGrid();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors text-foreground"
      >
        <CheckSquare size={14} className="text-muted-foreground" />
        Select Grid
      </button>

      <div className="h-px bg-border w-full" />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          onDeleteClick();
        }}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-destructive/10 transition-colors text-destructive"
      >
        <Trash2 size={14} /> Delete Grid
      </button>
    </div>
  );
}
