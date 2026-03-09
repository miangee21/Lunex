// src/components/chat/bubble/BubbleMenu.tsx
import { useState } from "react";
import { toast } from "sonner";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import BubbleDeleteDialog from "@/components/chat/bubble/BubbleDeleteDialog";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Reply,
  Copy,
  CheckSquare,
  Pencil,
  Trash2,
  Info,
  Download,
  Star,
  Pin,
} from "lucide-react";

interface BubbleMenuProps {
  messageId: string;
  text: string;
  type: string;
  isOwn: boolean;
  senderName?: string;
  sentAt?: number;
  onSelect?: () => void;
  mediaStorageId?: string;
  mediaOriginalName?: string;
  isStarred?: boolean;
  isPinned?: boolean;
  conversationId?: string;
}

export default function BubbleMenu({
  messageId,
  text,
  type,
  isOwn,
  senderName = "User",
  sentAt = 0,
  onSelect,
  mediaStorageId,
  mediaOriginalName,
  isStarred = false,
  isPinned = false,
  conversationId,
}: BubbleMenuProps) {
  const {
    setSelectedMessageForInfo,
    setReplyingTo,
    setEditingMessage,
    localMediaCache,
  } = useChatStore();
  const userId = useAuthStore((s) => s.userId);

  const toggleStarMessage = useMutation(api.messages.toggleStarMessage);
  const togglePinMessage = useMutation(api.messages.togglePinMessage);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const ONE_HOUR = 60 * 60 * 1000;
  const isEligibleForEdit = isOwn && type === "text" && Date.now() - sentAt < ONE_HOUR;

  const handleToggleStar = async () => {
    if (!userId) return;
    try {
      await toggleStarMessage({
        messageId: messageId as Id<"messages">,
        userId: userId as Id<"users">,
      });
    } catch {
      toast.error("Failed to update star status");
    }
  };

  const handleTogglePin = async () => {
    if (!conversationId) return;
    try {
      await togglePinMessage({
        messageId: messageId as Id<"messages">,
        conversationId: conversationId as Id<"conversations">,
      });
    } catch (error: any) {
      if (error.message?.includes("3 messages")) {
        toast.error("You can only pin up to 3 messages in a chat.");
      } else {
        toast.error("Failed to pin message.");
      }
    }
  };

  const handleDownload = async () => {
    const url = localMediaCache[mediaStorageId!];
    if (!url) {
      toast.error("File not loaded yet!");
      return;
    }

    const originalName = mediaOriginalName || text || "media";
    const extMatch = originalName.match(/\.([^.]+)$/);
    const ext = extMatch
      ? extMatch[1]
      : type === "image"
        ? "jpg"
        : type === "video"
          ? "mp4"
          : "bin";

    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `lunex_${Date.now()}_${randomStr}.${ext}`;

    try {
      const filePath = await save({
        defaultPath: fileName,
        title: "Save Media File",
      });
      if (!filePath) return;

      const toastId = toast.loading("Saving file...");
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await writeFile(filePath, uint8Array);
      toast.success("File saved successfully!", { id: toastId });
    } catch (error: any) {
      console.error("Native save failed:", error);
      toast.error(`Save Failed: ${error.message || error}`);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`p-0.5 rounded-full flex items-center justify-center transition-colors focus:outline-none ${
              isOwn
                ? "bg-primary text-primary-foreground hover:bg-black/10 dark:hover:bg-white/10"
                : "bg-secondary text-secondary-foreground hover:bg-black/10 dark:hover:bg-white/10"
            }`}
          >
            <ChevronDown className="w-4 h-4 opacity-80" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isOwn ? "end" : "start"}
          sideOffset={8}
          collisionPadding={16}
          className="w-48 shadow-lg rounded-xl z-9999"
        >
          <DropdownMenuItem
            className="cursor-pointer rounded-lg py-2"
            onClick={() =>
              setReplyingTo({ id: messageId, text, senderName, type })
            }
          >
            <Reply className="w-4 h-4 mr-2 text-muted-foreground" /> Reply
          </DropdownMenuItem>

          {type === "text" && (
            <DropdownMenuItem
              className="cursor-pointer rounded-lg py-2"
              onClick={() => {
                navigator.clipboard.writeText(text);
                toast.success("Copied!");
              }}
            >
              <Copy className="w-4 h-4 mr-2 text-muted-foreground" /> Copy
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className="cursor-pointer rounded-lg py-2"
            onClick={() => onSelect?.()}
          >
            <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground" />{" "}
            Select
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer rounded-lg py-2"
            onClick={handleToggleStar}
          >
            <Star
              className={`w-4 h-4 mr-2 ${isStarred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
            />
            {isStarred ? "Unstar" : "Star"}
          </DropdownMenuItem>

          {conversationId && (
            <DropdownMenuItem
              className="cursor-pointer rounded-lg py-2"
              onClick={handleTogglePin}
            >
              <Pin
                className={`w-4 h-4 mr-2 ${isPinned ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
              {isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
          )}

          {type !== "text" && mediaStorageId && (
            <DropdownMenuItem
              className="cursor-pointer rounded-lg py-2"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2 text-muted-foreground" />{" "}
              Download
            </DropdownMenuItem>
          )}

          {isOwn && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg py-2"
                onClick={() =>
                  setSelectedMessageForInfo({ id: messageId, text })
                }
              >
                <Info className="w-4 h-4 mr-2 text-muted-foreground" /> Info
              </DropdownMenuItem>
              {isEligibleForEdit && (
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg py-2"
                  onClick={() => setEditingMessage({ id: messageId, text })}
                >
                  <Pencil className="w-4 h-4 mr-2 text-muted-foreground" /> Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </>
          )}

          {!isOwn && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <BubbleDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        messageId={messageId}
        isOwn={isOwn}
        sentAt={sentAt}
        mediaStorageId={mediaStorageId}
      />
    </>
  );
}
