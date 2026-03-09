//src/hooks/useMessageSelection.ts
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { DecryptedMessage } from "@/types/chat";

type DeleteMutation = (args: {
  messageId: Id<"messages">;
  userId: Id<"users">;
}) => Promise<any>;

type Deps = {
  decryptedMessages: DecryptedMessage[];
  userId: string | null;
  deleteMessageForMe: DeleteMutation;
  deleteMessageForEveryone: DeleteMutation;
};

export function useMessageSelection({
  decryptedMessages,
  userId,
  deleteMessageForMe,
  deleteMessageForEveryone,
}: Deps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [selectMode, setSelectMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  function toggleSelectMessage(id: string) {
    const msg = decryptedMessages.find((m) => m.id === id);
    if (!msg) return;

    setSelectedMessages((prev) => {
      const next = new Set(prev);
      const isAlreadySelected = next.has(id);

      if (msg.uploadBatchId) {
        const batchMsgs = decryptedMessages.filter(
          (m) => m.uploadBatchId === msg.uploadBatchId,
        );
        batchMsgs.forEach((bm) => {
          if (isAlreadySelected) next.delete(bm.id);
          else next.add(bm.id);
        });
      } else {
        if (isAlreadySelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedMessages(new Set());
  }

  useEffect(() => {
    const handleSingleDelete = (e: any) => {
      setSelectedMessages(new Set([e.detail.id]));
      setIsDeleteDialogOpen(true);
    };
    window.addEventListener("open-delete-modal-for-single", handleSingleDelete);
    return () =>
      window.removeEventListener(
        "open-delete-modal-for-single",
        handleSingleDelete,
      );
  }, []);

  const selectedArray = Array.from(selectedMessages);
  let canDeleteForEveryone = false;

  if (selectedArray.length > 0) {
    const selectedMsgs = selectedArray
      .map((id) => decryptedMessages.find((m) => m.id === id))
      .filter(Boolean);
    const ONE_HOUR = 60 * 60 * 1000;
    const allOwn = selectedMsgs.every((m) => m!.isOwn);
    const allWithinTime = selectedMsgs.every(
      (m) => Date.now() - m!.timestamp < ONE_HOUR,
    );

    if (allOwn && allWithinTime) {
      if (selectedArray.length === 1) {
        canDeleteForEveryone = true;
      } else {
        const firstBatchId = selectedMsgs[0]!.uploadBatchId;
        if (
          firstBatchId &&
          selectedMsgs.every((m) => m!.uploadBatchId === firstBatchId)
        ) {
          canDeleteForEveryone = true;
        }
      }
    }
  }

  const handleBulkDeleteForMe = async () => {
    if (!userId) return;
    try {
      await Promise.all(
        selectedArray.map((msgId) =>
          deleteMessageForMe({
            messageId: msgId as Id<"messages">,
            userId: userId as Id<"users">,
          }),
        ),
      );
      toast.success("Messages deleted for you");
      setIsDeleteDialogOpen(false);
      exitSelectMode();
    } catch {
      toast.error("Failed to delete messages");
    }
  };

  const handleBulkDeleteForEveryone = async () => {
    if (!userId || selectedArray.length === 0) return;
    try {
      await Promise.all(
        selectedArray.map((msgId) =>
          deleteMessageForEveryone({
            messageId: msgId as Id<"messages">,
            userId: userId as Id<"users">,
          }),
        ),
      );
      toast.success("Messages deleted for everyone");
      setIsDeleteDialogOpen(false);
      exitSelectMode();
    } catch {
      toast.error("Failed to delete messages");
    }
  };

  return {
    selectedMessages,
    setSelectedMessages,
    selectMode,
    setSelectMode,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    toggleSelectMessage,
    exitSelectMode,
    selectedArray,
    canDeleteForEveryone,
    handleBulkDeleteForMe,
    handleBulkDeleteForEveryone,
  };
}
