//src/components/chat/BubbleMedia.tsx
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import MediaPreview from "@/components/chat/MediaPreview";
import { base64ToKey } from "@/crypto/keyDerivation";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";
import {
  FileText,
  Download,
  Play,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import DeletedMediaPlaceholder from "@/components/chat/DeletedMediaPlaceholder";

interface BubbleMediaProps {
  messageId: string;
  text: string;
  type: "image" | "video" | "file";
  isOwn: boolean;
  mediaStorageId: string | null;
  mediaIv: string | null;
  mediaOriginalName: string | null;
  mediaDeletedAt?: number | null;
}

export default function BubbleMedia({
  messageId,
  text,
  type,
  isOwn,
  mediaStorageId,
  mediaIv,
  mediaOriginalName,
  mediaDeletedAt = null,
}: BubbleMediaProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const handleReopen = (e: any) => {
      if (e.detail.id === messageId) {
        setPreviewOpen(true);
      }
    };
    window.addEventListener("reopen-preview", handleReopen);
    return () => window.removeEventListener("reopen-preview", handleReopen);
  }, [messageId]);

  const encryptedFileUrl = useQuery(
    api.media.getFileUrl,
    mediaStorageId ? { storageId: mediaStorageId as Id<"_storage"> } : "skip",
  );

  const secretKey = useAuthStore((s) => s.secretKey);
  const { activeChat } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId && userId ? { userId: activeChat.userId as Id<"users">, viewerId: userId as Id<"users"> } : "skip",
  );

  const instantUrl = useChatStore((s) =>
    mediaStorageId ? s.localMediaCache[mediaStorageId] : null,
  );

  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(isOwn || !!instantUrl);
  const [isDownloading, setIsDownloading] = useState(false);

  const finalUrl = instantUrl || decryptedUrl;

  useEffect(() => {
    if (!encryptedFileUrl || !mediaIv || !secretKey || !otherUser?.publicKey)
      return;
    if (!isDownloaded) return;
    if (finalUrl) return;

    let isMounted = true;
    setIsDownloading(true);

    async function decrypt() {
      try {
        const mimeType = getMimeTypeFromName(mediaOriginalName ?? "");
        const url = await decryptMediaFile(
          encryptedFileUrl!,
          mediaIv!,
          secretKey!,
          base64ToKey(otherUser!.publicKey),
          mimeType,
        );
        if (isMounted) {
          setDecryptedUrl(url);
          setIsDownloading(false);
          if (mediaStorageId)
            useChatStore.getState().addLocalMediaCache(mediaStorageId, url);
        }
      } catch {
        if (isMounted) {
          setIsDownloading(false);
          setIsDownloaded(false);
        }
      }
    }
    decrypt();
    return () => {
      isMounted = false;
    };
  }, [
    encryptedFileUrl,
    mediaIv,
    secretKey,
    otherUser?.publicKey,
    isDownloaded,
    finalUrl,
    mediaStorageId,
  ]);

  // ── FIX: Deleted Placeholder hamesha saare hooks ke baad aana chahiye ──
  if (mediaDeletedAt || !mediaStorageId) {
    return <DeletedMediaPlaceholder type={type} isOwn={isOwn} />;
  }

  const overlay = (
    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 transition-all rounded-xl overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        {type === "image" ? (
          <ImageIcon size={64} className="text-white" />
        ) : type === "video" ? (
          <Film size={64} className="text-white" />
        ) : (
          <FileText size={64} className="text-white" />
        )}
      </div>
      <div className="relative z-20 flex flex-col items-center gap-2">
        {!finalUrl &&
          (!isDownloaded ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDownloaded(true);
              }}
              className="w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all shadow-xl border border-white/20 hover:scale-105"
            >
              <Download size={22} />
            </button>
          ) : isDownloading ? (
            <div className="w-12 h-12 rounded-full border-[3.5px] border-white/30 border-t-white animate-spin shadow-xl"></div>
          ) : null)}
      </div>
    </div>
  );

  return (
    <>
      {previewOpen && finalUrl && (
        <MediaPreview
          storageId={mediaStorageId ?? ""}
          messageId={messageId}
          text={text}
          isOwn={isOwn}
          decryptedUrl={finalUrl}
          type={type}
          originalName={mediaOriginalName}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {type === "image" && (
        <div
          className="relative cursor-pointer rounded-xl overflow-hidden mb-1 w-55 h-35 sm:w-65 sm:h-45 bg-black/10 dark:bg-white/10"
          onClick={() => finalUrl && setPreviewOpen(true)}
        >
          {finalUrl ? (
            <img
              src={finalUrl}
              alt="image"
              className="w-full h-full object-cover rounded-xl hover:opacity-90 transition-opacity"
            />
          ) : (
            overlay
          )}
        </div>
      )}

      {type === "video" && (
        <div
          className="relative cursor-pointer rounded-xl overflow-hidden mb-1 w-55 h-35 sm:w-65 sm:h-45 bg-black/10 dark:bg-white/10"
          onClick={() => finalUrl && setPreviewOpen(true)}
        >
          {finalUrl ? (
            <div className="relative w-full h-full">
              <video
                src={finalUrl}
                className="w-full h-full object-cover rounded-xl"
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl hover:bg-black/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play size={20} className="text-white ml-0.5" fill="white" />
                </div>
              </div>
            </div>
          ) : (
            overlay
          )}
        </div>
      )}

      {type === "file" && (
        <div
          className={`flex items-center gap-3 mb-1 p-3 rounded-xl bg-black/10 dark:bg-white/10 transition-colors max-w-60 ${finalUrl || !isDownloaded ? "cursor-pointer hover:bg-black/15 dark:hover:bg-white/15" : ""}`}
          onClick={() => {
            if (finalUrl) setPreviewOpen(true);
            else if (!isDownloaded) setIsDownloaded(true);
          }}
        >
          <div className="w-11 h-11 rounded-lg bg-current/10 flex items-center justify-center shrink-0 relative overflow-hidden">
            {finalUrl ? (
              <FileText size={20} className="opacity-70" />
            ) : !isDownloaded ? (
              <Download size={20} className="opacity-70" />
            ) : isDownloading ? (
              <div className="w-6 h-6 rounded-full border-[2.5px] border-current/30 border-t-current animate-spin"></div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin opacity-50" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">
              {mediaOriginalName ?? "Document"}
            </p>
            <p className="text-[11px] opacity-60 mt-0.5">
              {finalUrl
                ? "Tap to open"
                : isDownloading
                  ? "Downloading..."
                  : "Tap to download"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
