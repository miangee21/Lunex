//src/components/chat/media/MediaGridGroup.tsx
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import MediaPreview from "@/components/chat/media/MediaPreview";
import MessageStatusTick from "@/components/chat/MessageStatusTick";
import EmojiPicker from "@/components/chat/input/EmojiPicker";
import DeletedMediaPlaceholder from "@/components/chat/media/DeletedMediaPlaceholder";
import { type DecryptedMessage } from "@/types/chat";
import { open } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import {
  decryptMediaFile,
  getMimeTypeFromName,
} from "@/crypto/mediaEncryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { encryptMessage } from "@/crypto/encryption";
import {
  Play,
  FileText,
  Film,
  Image as ImageIcon,
  Download,
  ChevronDown,
  CheckSquare,
  Trash2,
  Smile,
  Plus,
} from "lucide-react";

function MediaGridItem({
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
}: {
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

export default function MediaGridGroup({
  displayGroup,
  group,
  extraCount,
  secretKey,
  otherUser,
  activeChat,
  pinnedMessages = [],
  isGroupOwn,
  setGridMenuOpen,
  gridMenuOpen,
  toggleSelectMessage,
  selectMode,
  setSelectMode,
  selectedMessages,
  onDeleteClick,
}: any) {
  const localMediaCache = useChatStore((s) => s.localMediaCache);
  const jumpToMessageId = useChatStore((s) => s.jumpToMessageId);
  const currentUserId = useAuthStore((s) => s.userId);
  const addReaction = useMutation(api.messages.addReaction);
  const removeReaction = useMutation(api.messages.removeReaction);

  const [forceDownload, setForceDownload] = useState(false);
  const [showQuickReact, setShowQuickReact] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState<"top" | "bottom">("top");

  const allDownloaded =
    isGroupOwn ||
    displayGroup.every(
      (m: any) => m.mediaStorageId && localMediaCache[m.mediaStorageId],
    );

  const msg = group[group.length - 1];
  const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const isGridSelected = group.some((m: any) => selectedMessages.has(m.id));

  useEffect(() => {
    if (jumpToMessageId && group.some((m: any) => m.id === jumpToMessageId)) {
      const wrapElement = document.getElementById(`wrap-${group[0].id}`);
      if (wrapElement) {
        wrapElement.scrollIntoView({ behavior: "smooth", block: "center" });
        wrapElement.classList.add(
          "ring-2",
          "ring-primary",
          "bg-primary/20",
          "scale-[1.02]",
          "transition-all",
          "duration-300",
        );
        setTimeout(() => {
          wrapElement.classList.remove(
            "ring-2",
            "ring-primary",
            "bg-primary/20",
            "scale-[1.02]",
          );
        }, 1200);
      }

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("reopen-preview", {
            detail: { id: jumpToMessageId },
          }),
        );
      }, 300);
    }
  }, [jumpToMessageId, group]);

  const handleSelectGrid = (e?: any) => {
    if (e) e.stopPropagation();
    setSelectMode(true);
    const allSelected = group.every((m: any) => selectedMessages.has(m.id));
    group.forEach((m: any) => {
      if (allSelected) {
        if (selectedMessages.has(m.id)) toggleSelectMessage(m.id);
      } else {
        if (!selectedMessages.has(m.id)) toggleSelectMessage(m.id);
      }
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowQuickReact(false);
        setShowEmojiPicker(false);
      }
    }
    if (showQuickReact || showEmojiPicker)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showQuickReact, showEmojiPicker]);

  const handleEmojiSelect = async (emoji: string) => {
    if (!currentUserId || !secretKey || !otherUser?.publicKey) {
      toast.error("Encryption keys missing!");
      return;
    }
    const myExistingReaction = msg.reactions?.find(
      (r: any) => r.userId === currentUserId,
    );
    try {
      if (myExistingReaction && myExistingReaction.emoji === emoji) {
        await removeReaction({
          messageId: msg.id as never,
          userId: currentUserId as never,
        });
      } else {
        const theirPublicKeyBytes = base64ToKey(otherUser.publicKey);
        const { encryptedContent, iv } = encryptMessage(
          emoji,
          secretKey,
          theirPublicKeyBytes,
        );
        await addReaction({
          messageId: msg.id as never,
          userId: currentUserId as never,
          encryptedEmoji: encryptedContent,
          iv: iv,
        });
      }
    } catch (error) {
      console.error(error);
    }
    setShowQuickReact(false);
    setShowEmojiPicker(false);
  };

  return (
    <div
      className={`flex w-full group/grid py-1 transition-all duration-500 ${isGroupOwn ? "justify-end" : "justify-start"} ${selectMode ? "cursor-pointer" : ""} ${showQuickReact || showEmojiPicker ? "relative z-100" : "z-10"}`}
      onClick={() => selectMode && handleSelectGrid()}
    >
      {selectMode && (
        <div className="flex items-center justify-center mr-2 mb-1">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isGridSelected ? "bg-primary border-primary" : "border-muted-foreground"}`}
          >
            {isGridSelected && (
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
        className={`relative flex max-w-[75%] md:max-w-[65%] items-end gap-2 ${isGroupOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`relative group px-1.5 pt-1.5 pb-6 rounded-2xl shadow-sm transition-all duration-200 w-60 sm:w-70 ${isGroupOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-card-foreground border border-border/50 rounded-bl-sm"}`}
        >
          {msg.mediaDeletedAt ? (
            <DeletedMediaPlaceholder type="grid" isOwn={isGroupOwn} />
          ) : (
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
                    isStarred={gMsg.isStarred}
                    isPinned={pinnedMessages?.includes(gMsg.id)}
                    conversationId={activeChat?.conversationId}
                    gallery={group.map((m: any) => ({
                      storageId: m.mediaStorageId!,
                      messageId: m.id,
                      text: m.text,
                      isOwn: m.isOwn,
                      type: m.type as "image" | "video" | "file",
                      originalName: m.mediaOriginalName,
                      mediaIv: m.mediaIv,
                      isStarred: m.isStarred ?? false,
                      isPinned: pinnedMessages?.includes(m.id) ?? false,
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
          )}

          <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10.5px] font-medium opacity-70 z-10 text-current">
            <span>{msg.time}</span>
            {isGroupOwn && (
              <MessageStatusTick
                isSeen={
                  activeChat?.userId
                    ? msg.readBy?.some(
                        (r: any) => r.userId === activeChat.userId,
                      )
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

          <div
            className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 ${gridMenuOpen === msg.id ? "opacity-100" : ""}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGridMenuOpen(gridMenuOpen === msg.id ? null : msg.id);
              }}
              className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md shadow-sm"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {gridMenuOpen === msg.id && (
            <div className="absolute top-9 right-2 w-48 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95">
              {!msg.mediaDeletedAt && (
                <>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setGridMenuOpen(null);

                      let missingFiles = false;
                      group.forEach((m: any) => {
                        if (
                          m.mediaStorageId &&
                          !localMediaCache[m.mediaStorageId]
                        )
                          missingFiles = true;
                      });

                      if (missingFiles) {
                        setForceDownload(true);
                        toast.info(
                          "Decrypting secure files... Please click Download All again in a moment.",
                        );
                        return;
                      }

                      const toastId = toast.loading(
                        `Saving ${group.length} files...`,
                      );

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

                        const separator = (selectedDirPath as string).includes(
                          "\\",
                        )
                          ? "\\"
                          : "/";

                        for (let i = 0; i < group.length; i++) {
                          const m = group[i];
                          if (
                            m.mediaStorageId &&
                            localMediaCache[m.mediaStorageId]
                          ) {
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

                            const randomStr = Math.random()
                              .toString(36)
                              .substring(2, 8);
                            const fileName = `lunex_${Date.now()}_${randomStr}.${ext}`;
                            const filePath = `${selectedDirPath}${separator}${fileName}`;

                            const response = await fetch(url);
                            const arrayBuffer = await response.arrayBuffer();
                            const uint8Array = new Uint8Array(arrayBuffer);

                            await writeFile(filePath, uint8Array);
                          }
                        }

                        toast.success("All files saved successfully!", {
                          id: toastId,
                        });
                      } catch (error: any) {
                        console.error("Native download failed:", error);

                        toast.error(`Save Failed: ${error.message || error}`, {
                          id: toastId,
                          duration: 8000,
                        });

                        group.forEach((m: any, index: number) => {
                          if (
                            m.mediaStorageId &&
                            localMediaCache[m.mediaStorageId]
                          ) {
                            setTimeout(() => {
                              const a = document.createElement("a");
                              a.href = localMediaCache[m.mediaStorageId];
                              a.download =
                                m.mediaOriginalName ||
                                `lunex-media-${index + 1}`;
                              a.style.display = "none";
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }, index * 500);
                          }
                        });
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors"
                  >
                    <Download size={14} className="text-muted-foreground" />{" "}
                    Download All
                  </button>

                  <div className="h-px bg-border w-full" />
                </>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectGrid();
                  setGridMenuOpen(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors text-foreground"
              >
                <CheckSquare size={14} className="text-muted-foreground" />{" "}
                Select Grid
              </button>

              <div className="h-px bg-border w-full" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setGridMenuOpen(null);
                  if (onDeleteClick) onDeleteClick();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-destructive/10 transition-colors text-destructive"
              >
                <Trash2 size={14} /> Delete Grid
              </button>
            </div>
          )}

          {msg.reactions && msg.reactions.length > 0 && (
            <div
              className={`absolute -bottom-5 ${isGroupOwn ? "right-2" : "left-2"} flex flex-wrap gap-1 z-10 bg-background dark:bg-sidebar border border-border rounded-full p-0.5 shadow-sm`}
            >
              {Object.entries(
                msg.reactions.reduce(
                  (acc: any, r: any) => {
                    if (!acc[r.emoji])
                      acc[r.emoji] = { count: 0, hasMine: false };
                    acc[r.emoji].count += 1;
                    if (r.userId === currentUserId) acc[r.emoji].hasMine = true;
                    return acc;
                  },
                  {} as Record<string, { count: number; hasMine: boolean }>,
                ),
              ).map(([emoji, data]: any) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmojiSelect(emoji);
                  }}
                  className={`text-[11px] font-medium rounded-full px-1.5 py-0.5 flex items-center gap-1 transition-colors ${data.hasMine ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  <span>{emoji}</span>
                  {data.count > 1 && <span>{data.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={`relative self-center transition-opacity ${showQuickReact || showEmojiPicker ? "z-9999 opacity-100" : "z-20 opacity-0 group-hover/grid:opacity-100"}`}
          ref={emojiPickerRef}
        >
          <button
            onClick={() => {
              if (!showQuickReact) {
                if (emojiPickerRef.current) {
                  const rect = emojiPickerRef.current.getBoundingClientRect();
                  setPickerPosition(rect.top < 150 ? "bottom" : "top");
                }
                setShowQuickReact(true);
                setShowEmojiPicker(false);
              } else {
                setShowQuickReact(false);
              }
            }}
            className={`p-1.5 rounded-full transition-colors ${showQuickReact || showEmojiPicker ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            <Smile size={18} />
          </button>

          {showQuickReact && (
            <div
              className={`absolute ${pickerPosition === "top" ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"} ${isGroupOwn ? `right-0 ${pickerPosition === "top" ? "origin-bottom-right" : "origin-top-right"}` : `left-0 ${pickerPosition === "top" ? "origin-bottom-left" : "origin-top-left"}`} flex items-center gap-1 bg-card text-card-foreground shadow-[0_4px_15px_rgba(0,0,0,0.15)] border border-border/50 rounded-full px-2.5 py-1.5 w-max flex-nowrap z-9999 animate-in zoom-in-75 duration-200`}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmojiSelect(emoji);
                  }}
                  className="hover:scale-125 transition-transform text-xl px-1.5 shrink-0"
                >
                  {emoji}
                </button>
              ))}
              <div className="w-px h-5 bg-border mx-1 shrink-0" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (emojiPickerRef.current) {
                    const rect = emojiPickerRef.current.getBoundingClientRect();
                    setPickerPosition(rect.top < 400 ? "bottom" : "top");
                  }
                  setShowQuickReact(false);
                  setShowEmojiPicker(true);
                }}
                className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground shrink-0"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          {showEmojiPicker && (
            <div
              className={`absolute ${pickerPosition === "top" ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"} ${isGroupOwn ? `right-0 ${pickerPosition === "top" ? "origin-bottom-right" : "origin-top-right"}` : `left-0 ${pickerPosition === "top" ? "origin-bottom-left" : "origin-top-left"}`} z-9999 animate-in zoom-in-75 duration-200`}
            >
              <div
                className={`scale-[0.85] ${pickerPosition === "top" ? "origin-bottom" : "origin-top"} shadow-2xl rounded-xl overflow-hidden border border-border/50`}
              >
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
