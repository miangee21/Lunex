// src/components/chat/media/MediaGridItem.tsx
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useChatStore } from "@/store/chatStore";
import MediaPreview from "@/components/chat/media/MediaPreview";
import { base64ToKey } from "@/crypto/keyDerivation";
import { type DecryptedMessage } from "@/types/chat";
import { Play, FileText, Film, Image as ImageIcon } from "lucide-react";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";

interface MediaGridItemProps {
  msg: DecryptedMessage;
  className?: string;
  gallery?: Array<any>;
  galleryIndex?: number;
  secretKey: any;
  theirPublicKeyBase64?: string;
  otherUserId?: string;
  forceDownload?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  conversationId?: string;
}

export default function MediaGridItem({
  msg,
  className,
  gallery = [],
  galleryIndex = 0,
  secretKey,
  theirPublicKeyBase64,
  forceDownload,
  isStarred,
  isPinned,
  conversationId,
}: MediaGridItemProps) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);
  const [previewOpen, setPreviewOpen] = useState(false);
  const instantUrl = msg.mediaStorageId
    ? localMediaCache[msg.mediaStorageId]
    : null;
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);

  const finalUrl = instantUrl || decryptedUrl;

  const [isDownloaded, setIsDownloaded] = useState(
    msg.isOwn || !!instantUrl || forceDownload,
  );

  useEffect(() => {
    if (forceDownload) setIsDownloaded(true);
  }, [forceDownload]);

  useEffect(() => {
    const handleReopen = (e: any) => {
      if (e.detail.id === msg.id) setPreviewOpen(true);
    };
    window.addEventListener("reopen-preview", handleReopen);
    return () => window.removeEventListener("reopen-preview", handleReopen);
  }, [msg.id]);

  const encryptedFileUrl = useQuery(
    api.media.getFileUrl,
    !instantUrl && msg.mediaStorageId
      ? { storageId: msg.mediaStorageId as Id<"_storage"> }
      : "skip",
  );

  useEffect(() => {
    if (
      instantUrl ||
      !isDownloaded ||
      !encryptedFileUrl ||
      !msg.mediaIv ||
      !secretKey ||
      !theirPublicKeyBase64 ||
      finalUrl
    )
      return;
    let isMounted = true;
    async function decrypt() {
      try {
        const mimeType = getMimeTypeFromName(msg.mediaOriginalName ?? "");
        const url = await decryptMediaFile(
          encryptedFileUrl!,
          msg.mediaIv!,
          secretKey,
          base64ToKey(theirPublicKeyBase64!),
          mimeType,
        );
        if (isMounted) {
          setDecryptedUrl(url);
          if (msg.mediaStorageId)
            useChatStore.getState().addLocalMediaCache(msg.mediaStorageId, url);
        }
      } catch {
        if (isMounted) setIsDownloaded(false);
      }
    }
    decrypt();
    return () => {
      isMounted = false;
    };
  }, [
    encryptedFileUrl,
    msg.mediaIv,
    secretKey,
    theirPublicKeyBase64,
    instantUrl,
    isDownloaded,
    finalUrl,
    msg.mediaStorageId,
  ]);

  return (
    <>
      {previewOpen && msg.mediaStorageId && (
        <MediaPreview
          storageId={msg.mediaStorageId}
          messageId={msg.id}
          text={msg.text}
          isOwn={msg.isOwn}
          decryptedUrl={finalUrl}
          type={
            msg.type === "text"
              ? "file"
              : (msg.type as "image" | "video" | "file")
          }
          originalName={msg.mediaOriginalName}
          mediaIv={msg.mediaIv}
          secretKey={secretKey}
          theirPublicKey={
            theirPublicKeyBase64 ? base64ToKey(theirPublicKeyBase64) : undefined
          }
          onClose={() => setPreviewOpen(false)}
          gallery={gallery}
          galleryIndex={galleryIndex}
          isStarred={isStarred}
          isPinned={isPinned}
          conversationId={conversationId}
        />
      )}
      <div
        className={`relative cursor-pointer overflow-hidden bg-black/10 dark:bg-white/10 ${className}`}
        onClick={() => {
          if (finalUrl) setPreviewOpen(true);
        }}
      >
        {msg.type === "image" && finalUrl ? (
          <img
            src={finalUrl}
            alt="image"
            className="absolute inset-0 w-full h-full object-cover hover:opacity-90 transition-opacity"
          />
        ) : msg.type === "video" && finalUrl ? (
          <div className="absolute inset-0 w-full h-full">
            <video
              src={finalUrl}
              className="w-full h-full object-cover"
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play size={14} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          </div>
        ) : msg.type === "file" && finalUrl ? (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black/5 p-2 transition-colors hover:bg-black/10">
            <FileText size={24} className="opacity-70 mb-2" />
            <p className="text-[10px] font-semibold truncate w-full text-center px-1">
              {msg.text || "File"}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/20 dark:bg-white/5">
            {msg.type === "video" ? (
              <Film size={32} className="text-white opacity-40" />
            ) : msg.type === "file" ? (
              <FileText size={32} className="text-white opacity-40" />
            ) : (
              <ImageIcon size={32} className="text-white opacity-40" />
            )}
          </div>
        )}
      </div>
    </>
  );
}
