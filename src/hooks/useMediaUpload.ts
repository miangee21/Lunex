//src/hooks/useMediaUpload.ts
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useChatStore, type PendingUpload } from "@/store/chatStore";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { encryptMediaFile } from "@/crypto/mediaEncryption";
import { toast } from "sonner";
import { validateFile, type AllowedFileType } from "@/lib/fileValidation";

interface UseMediaUploadProps {
  userId: string | null;
  secretKey: any;
  activeChat: any;
  otherUserPublicKey?: string;
}

export function useMediaUpload({
  userId,
  secretKey,
  activeChat,
  otherUserPublicKey,
}: UseMediaUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ file: File; type: AllowedFileType }>
  >([]);

  const {
    addPendingUploads,
    updateUploadProgress,
    updateUploadStatus,
    removePendingUpload,
    addLocalMediaCache,
    updateLastMessageCache,
    updateReadByCache,
  } = useChatStore();

  const sendMessage = useMutation(api.messages.sendMessage);
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const deleteMedia = useMutation(api.media.deleteMedia);

  function handleAddMoreFiles(newFiles: File[]) {
    const valid: Array<{ file: File; type: AllowedFileType }> = [];

    newFiles.forEach((file) => {
      const result = validateFile(file);
      if (!result.valid) {
        toast.error(`${file.name}: ${result.error}`);
      } else {
        const isDuplicate = selectedFiles.some(
          (existing) =>
            existing.file.name === file.name &&
            existing.file.size === file.size,
        );
        if (!isDuplicate) {
          valid.push({ file, type: result.type! });
        }
      }
    });

    if (valid.length > 0) {
      setSelectedFiles((prev) => {
        const combined = [...prev, ...valid];
        if (combined.length > 10) {
          toast.error("Maximum 10 files allowed at a time.");
          return combined.slice(0, 10);
        }
        return combined;
      });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    handleAddMoreFiles(files);
    e.target.value = "";
  }

  function handleCancelFile() {
    setSelectedFiles([]);
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const processBackgroundUploads = async (
    items: PendingUpload[],
    conversationId: string,
    theirPublicKey: Uint8Array,
  ) => {
    const readyToSend: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        let currentStore =
          useChatStore.getState().pendingUploads[conversationId] || [];
        let storeItem = currentStore.find((p) => p.id === item.id);
        if (!storeItem || storeItem.status === "error") continue;

        updateUploadProgress(conversationId, item.id, 10);
        const uploadUrl = await generateUploadUrl();

        currentStore =
          useChatStore.getState().pendingUploads[conversationId] || [];
        storeItem = currentStore.find((p) => p.id === item.id);
        if (!storeItem || storeItem.status === "error") continue;

        updateUploadProgress(conversationId, item.id, 20);
        const { encryptedBlob, iv: mediaIv } = await encryptMediaFile(
          item.file,
          secretKey!,
          theirPublicKey,
        );

        updateUploadProgress(conversationId, item.id, 50);
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: encryptedBlob,
        });

        if (!uploadRes.ok) throw new Error("Upload failed");

        updateUploadProgress(conversationId, item.id, 80);
        const { storageId } = await uploadRes.json();

        addLocalMediaCache(storageId, item.previewUrl);

        const { encryptedContent, iv } = encryptMessage(
          item.file.name,
          secretKey!,
          theirPublicKey,
        );

        updateUploadProgress(conversationId, item.id, 100);

        currentStore =
          useChatStore.getState().pendingUploads[conversationId] || [];
        storeItem = currentStore.find((p) => p.id === item.id);

        if (!storeItem || storeItem.status === "error") {
          try {
            await deleteMedia({ storageId: storageId as Id<"_storage"> });
          } catch (e) {
            console.error("Ghost fix failed", e);
          }
          continue;
        }

        readyToSend.push({
          itemId: item.id,
          previewUrl: item.previewUrl,
          messageData: {
            conversationId: conversationId as Id<"conversations">,
            senderId: userId as Id<"users">,
            encryptedContent,
            iv,
            type: item.type,
            mediaStorageId: storageId as Id<"_storage">,
            mediaIv,
            mediaOriginalName: item.file.name,
          },
        });
      } catch (err) {
        toast.error(`Failed to upload ${item.file.name}`);
        updateUploadStatus(conversationId, item.id, "error");
      }
    }

    if (readyToSend.length > 0) {
      await Promise.all(
        readyToSend.map((readyItem) => sendMessage(readyItem.messageData)),
      );

      setTimeout(() => {
        readyToSend.forEach((readyItem) => {
          removePendingUpload(conversationId, readyItem.itemId);
        });
      }, 500);

      const lastItem = readyToSend[readyToSend.length - 1].messageData;
      const now = Date.now();
      updateLastMessageCache(conversationId, {
        text: lastItem.mediaOriginalName,
        senderId: userId!,
        sentAt: now,
        type: lastItem.type,
      });
      updateReadByCache(conversationId, [{ userId: userId!, time: now }]);
    }
  };

  const handleSendMedia = () => {
    if (!selectedFiles.length) return;

    if (!userId || !secretKey || !activeChat?.conversationId) {
      toast.error("Cannot send — missing required data.");
      return;
    }
    if (!otherUserPublicKey) {
      toast.error("Cannot encrypt — public key missing.");
      return;
    }

    const conversationId = activeChat.conversationId;
    const theirPublicKey = base64ToKey(otherUserPublicKey);

    const pendingItems: PendingUpload[] = selectedFiles.map((item) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file: item.file,
      type: item.type,
      progress: 0,
      previewUrl: URL.createObjectURL(item.file),
      status: "uploading",
    }));

    addPendingUploads(conversationId, pendingItems);
    setSelectedFiles([]);
    processBackgroundUploads(pendingItems, conversationId, theirPublicKey);
  };

  return {
    selectedFiles,
    handleFileChange,
    handleCancelFile,
    handleRemoveFile,
    handleAddMoreFiles,
    handleSendMedia,
    processBackgroundUploads,
  };
}
