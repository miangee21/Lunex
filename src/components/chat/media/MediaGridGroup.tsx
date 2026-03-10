// src/components/chat/media/MediaGridGroup.tsx
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import MessageStatusTick from "@/components/chat/MessageStatusTick";
import DeletedMediaPlaceholder from "@/components/chat/media/DeletedMediaPlaceholder";
import MediaGridItem from "@/components/chat/media/MediaGridItem";
import MediaGridMenu from "@/components/chat/media/MediaGridMenu";
import MediaGridReactBar from "@/components/chat/media/MediaGridReactBar";
import { base64ToKey } from "@/crypto/keyDerivation";
import { encryptMessage } from "@/crypto/encryption";
import { Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";

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

  const allDownloaded =
    isGroupOwn ||
    displayGroup.every(
      (m: any) => m.mediaStorageId && localMediaCache[m.mediaStorageId],
    );

  const msg = group[group.length - 1];
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
  };

  return (
    <div
      className={`flex w-full group/grid py-1 transition-all duration-500 ${isGroupOwn ? "justify-end" : "justify-start"} ${selectMode ? "cursor-pointer" : ""}`}
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
            <MediaGridMenu
              group={group}
              msg={msg}
              mediaDeletedAt={msg.mediaDeletedAt}
              isGroupOwn={isGroupOwn}
              onSelectGrid={handleSelectGrid}
              onDeleteClick={onDeleteClick}
              onClose={() => setGridMenuOpen(null)}
              setForceDownload={setForceDownload}
            />
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

        <MediaGridReactBar onEmojiSelect={handleEmojiSelect} />
      </div>
    </div>
  );
}
