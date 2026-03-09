// src/components/chat/bubble/BubbleDeleteDialog.tsx
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BubbleDeleteDialogProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  messageId: string;
  isOwn: boolean;
  sentAt: number;
  mediaStorageId?: string;
}

export default function BubbleDeleteDialog({
  open,
  onOpenChange,
  messageId,
  isOwn,
  sentAt,
  mediaStorageId,
}: BubbleDeleteDialogProps) {
  const { localMediaCache } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const deleteMessageForMe = useMutation(api.messages.deleteMessageForMe);
  const deleteMessageForEveryone = useMutation(
    api.messages.deleteMessageForEveryone,
  );

  const ONE_HOUR = 60 * 60 * 1000;
  const isEligibleForEveryone = isOwn && Date.now() - sentAt < ONE_HOUR;

  const clearMedia = () => {
    if (mediaStorageId && localMediaCache[mediaStorageId]) {
      URL.revokeObjectURL(localMediaCache[mediaStorageId]);
      console.log("RAM Cleared for media:", mediaStorageId);
    }
  };

  const handleDeleteForMe = async () => {
    if (!userId) return;
    try {
      clearMedia();
      await deleteMessageForMe({
        messageId: messageId as Id<"messages">,
        userId: userId as Id<"users">,
      });
      toast.success("Message deleted for you");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!userId) return;
    try {
      clearMedia();
      await deleteMessageForEveryone({
        messageId: messageId as Id<"messages">,
        userId: userId as Id<"users">,
      });
      toast.success("Message deleted for everyone");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete message");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl shadow-xl border-border sm:max-w-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground font-bold">
            Delete Message?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-[15px] leading-relaxed">
            {isEligibleForEveryone
              ? "You can delete this message for everyone or just for yourself."
              : "Are you sure you want to delete this message for yourself? This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent border border-transparent hover:border-border transition-colors w-full sm:w-auto text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteForMe}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-transparent hover:bg-accent transition-colors w-full sm:w-auto text-foreground"
          >
            Delete for me
          </button>
          {isEligibleForEveryone && (
            <button
              onClick={handleDeleteForEveryone}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors w-full sm:w-auto"
            >
              Delete for everyone
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
