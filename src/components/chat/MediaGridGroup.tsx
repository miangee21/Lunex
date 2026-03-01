//src/components/chat/MediaPreview.tsx
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useChatStore } from "@/store/chatStore";
import MediaPreview from "@/components/chat/MediaPreview";
import MessageStatusTick from "@/components/chat/MessageStatusTick";
import { toast } from "sonner";
import { type DecryptedMessage } from "@/components/chat/ChatArea";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import {
  Play,
  FileText,
  Film,
  Image as ImageIcon,
  Download,
  ChevronDown,
  CornerDownLeft,
  CheckSquare,
  Trash2,
} from "lucide-react";

function MediaGridItem({
  msg,
  className,
  gallery = [],
  galleryIndex = 0,
  secretKey,
  theirPublicKeyBase64,
  forceDownload,
}: {
  msg: DecryptedMessage;
  className?: string;
  gallery?: Array<any>;
  galleryIndex?: number;
  secretKey: any;
  theirPublicKeyBase64?: string;
  otherUserId?: string;
  forceDownload?: boolean;
}) {
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
      if (e.detail.id === msg.id) {
        setPreviewOpen(true);
      }
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
      } catch (err) {
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
              {msg.mediaOriginalName ?? "File"}
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

export default function MediaGridGroup({
  displayGroup,
  group,
  extraCount,
  secretKey,
  otherUser,
  activeChat,
  isGroupOwn,
  setGridMenuOpen,
  gridMenuOpen,
  toggleSelectMessage,
  selectMode,
  setSelectMode,
  selectedMessages,
}: any) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);
  const allDownloaded =
    isGroupOwn ||
    displayGroup.every(
      (m: any) => m.mediaStorageId && localMediaCache[m.mediaStorageId],
    );
  const [forceDownload, setForceDownload] = useState(false);

  const msg = group[group.length - 1];

  return (
    <div
      className={`flex w-full group/grid py-1 ${isGroupOwn ? "justify-end" : "justify-start"} ${selectMode ? "cursor-pointer" : ""}`}
      onClick={() => selectMode && toggleSelectMessage(msg.id)}
    >
      {selectMode && (
        <div className="flex items-center justify-center mr-2 mb-1">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMessages.has(msg.id) ? "bg-primary border-primary" : "border-muted-foreground"}`}
          >
            {selectedMessages.has(msg.id) && (
              <svg
                className="w-3 h-3 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      <div
        className={`relative group px-1.5 pt-1.5 pb-6 rounded-2xl shadow-sm transition-all duration-200 w-60 sm:w-70 ${isGroupOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-card-foreground border border-border/50 rounded-bl-sm"}`}
      >
        <div
          className={`relative grid gap-1 w-full aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 ${displayGroup.length === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2"}`}
        >
          {displayGroup.map((gMsg: any, gIdx: number) => (
            <div
              key={gMsg.id}
              className={`relative w-full h-full ${displayGroup.length === 3 && gIdx === 0 ? "col-span-2" : ""}`}
            >
              <MediaGridItem
                msg={gMsg}
                className="absolute inset-0 w-full h-full"
                secretKey={secretKey}
                theirPublicKeyBase64={otherUser?.publicKey}
                otherUserId={activeChat?.userId}
                forceDownload={forceDownload}
                gallery={group.map((m: any) => ({
                  storageId: m.mediaStorageId!,
                  messageId: m.id,
                  text: m.text,
                  isOwn: m.isOwn,
                  type: m.type as "image" | "video" | "file",
                  originalName: m.mediaOriginalName,
                  mediaIv: m.mediaIv,
                }))}
                galleryIndex={gIdx}
              />
              {gIdx === 3 && extraCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-10 backdrop-blur-[1px]">
                  <span className="text-white font-bold text-2xl">
                    +{extraCount}
                  </span>
                </div>
              )}
            </div>
          ))}

          {!allDownloaded && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              {!forceDownload ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setForceDownload(true);
                  }}
                  className="w-14 h-14 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-all shadow-2xl border border-white/20 hover:scale-105"
                  title="Download All"
                >
                  <Download size={26} />
                </button>
              ) : (
                <div className="w-12 h-12 rounded-full border-[3.5px] border-white/30 border-t-white animate-spin shadow-2xl"></div>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10.5px] font-medium opacity-70 z-10 text-current">
          <span>{msg.time}</span>
          {isGroupOwn && (
            <MessageStatusTick
              isSeen={
                activeChat?.userId
                  ? msg.readBy?.some((r: any) => r.userId === activeChat.userId)
                  : false
              }
              isDelivered={
                activeChat?.userId
                  ? msg.deliveredTo?.some(
                      (d: any) => d.userId === activeChat.userId,
                    )
                  : false
              }
            />
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setGridMenuOpen(msg.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md z-10`}
        >
          <ChevronDown size={14} />
        </button>
        {gridMenuOpen === msg.id && (
          <div className="absolute top-9 right-2 w-48 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Feature coming soon!");
                setGridMenuOpen(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors"
            >
              <CornerDownLeft size={14} className="text-muted-foreground" />{" "}
              Reply
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Feature coming soon!");
                setGridMenuOpen(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors"
            >
              <Download size={14} className="text-muted-foreground" /> Download
              All
            </button>
            <div className="h-px bg-border w-full" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectMode(true);
                toggleSelectMessage(msg.id);
                setGridMenuOpen(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors text-foreground"
            >
              <CheckSquare size={14} className="text-muted-foreground" /> Select
              Mode
            </button>
            <div className="h-px bg-border w-full" />
            {isGroupOwn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success("Feature coming soon!");
                  setGridMenuOpen(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-destructive/10 transition-colors text-destructive"
              >
                <Trash2 size={14} /> Delete for everyone
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Feature coming soon!");
                setGridMenuOpen(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-destructive/10 transition-colors text-destructive"
            >
              <Trash2 size={14} /> Delete for me
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
