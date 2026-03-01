import { useState, useRef, useEffect } from "react";
import {
  Smile,
  Paperclip,
  Send,
  UserX,
  ShieldOff,
  Shield,
  CheckSquare,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore, type PendingUpload } from "@/store/chatStore";
import { Id } from "../../../convex/_generated/dataModel";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { encryptMediaFile } from "@/crypto/mediaEncryption";
import { toast } from "sonner";
import { validateFile, type AllowedFileType } from "@/lib/fileValidation";
import PreSendMediaPreview from "@/components/chat/PreSendMediaPreview";

interface ChatInputProps {
  selectMode?: boolean;
  selectedCount?: number;
  onCancelSelect?: () => void;
  onDeleteSelected?: () => void;
}

export default function ChatInput({
  selectMode = false,
  selectedCount = 0,
  onCancelSelect,
  onDeleteSelected,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ file: File; type: AllowedFileType }>
  >([]);

  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const {
    activeChat,
    updateLastMessageCache,
    updateReadByCache,
    addPendingUploads,
    updateUploadProgress,
    updateUploadStatus,
    removePendingUpload,
    addLocalMediaCache, 
  } = useChatStore();

  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const deleteMedia = useMutation(api.media.deleteMedia); 

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId ? { userId: activeChat.userId as never } : "skip",
  );
  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip",
  );
  const blockedUsers = useQuery(
    api.friends.getBlockedUsers,
    userId ? { userId } : "skip",
  );

  const friendship = friends?.find((f) => f?.userId === activeChat?.userId);
  const iBlockedThem = blockedUsers?.find(
    (b) => b.userId === activeChat?.userId,
  );
  const hasBlockedMe = friendship?.hasBlockedMe ?? false;
  const areFriends = !!friendship && !iBlockedThem && !hasBlockedMe;

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (activeChat?.conversationId && userId) {
        clearTyping({
          conversationId: activeChat.conversationId as Id<"conversations">,
          userId: userId as Id<"users">,
        });
      }
    };
  }, [activeChat?.conversationId]);

  useEffect(() => {
    const handleRetryEvent = (e: any) => {
      const itemId = e.detail.id;
      const conversationId = activeChat?.conversationId;
      if (!conversationId || !otherUser?.publicKey || !secretKey) return;

      const pendingItems = useChatStore.getState().pendingUploads[conversationId] || [];
      const itemToRetry = pendingItems.find((p) => p.id === itemId);

      if (itemToRetry) {
        updateUploadProgress(conversationId, itemId, 0); 
        updateUploadStatus(conversationId, itemId, "uploading");
        processBackgroundUploads([itemToRetry], conversationId, base64ToKey(otherUser.publicKey));
      }
    };

    window.addEventListener("retry-upload", handleRetryEvent);
    return () => window.removeEventListener("retry-upload", handleRetryEvent);
  }, [activeChat?.conversationId, otherUser?.publicKey, secretKey]);

  async function handleTyping() {
    if (!activeChat?.conversationId || !userId) return;

    await setTyping({
      conversationId: activeChat.conversationId as Id<"conversations">,
      userId: userId as Id<"users">,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await clearTyping({
        conversationId: activeChat.conversationId as Id<"conversations">,
        userId: userId as Id<"users">,
      });
    }, 5000);
  }

  function handleFileClick() {
    fileInputRef.current?.click();
  }

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

  const handleSendMedia = () => {
    if (!selectedFiles.length) return;

    if (!userId || !secretKey || !activeChat?.conversationId) {
      toast.error("Cannot send — missing required data.");
      return;
    }
    if (!otherUser?.publicKey) {
      toast.error("Cannot encrypt — public key missing.");
      return;
    }

    const conversationId = activeChat.conversationId;
    const theirPublicKey = base64ToKey(otherUser.publicKey);

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

  const processBackgroundUploads = async (
    items: PendingUpload[],
    conversationId: string,
    theirPublicKey: Uint8Array,
  ) => {
    const readyToSend: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        let currentStore = useChatStore.getState().pendingUploads[conversationId] || [];
        let storeItem = currentStore.find((p) => p.id === item.id);
        if (!storeItem || storeItem.status === "error") continue; 

        updateUploadProgress(conversationId, item.id, 10);
        const uploadUrl = await generateUploadUrl();

        currentStore = useChatStore.getState().pendingUploads[conversationId] || [];
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
          theirPublicKey
        );

        updateUploadProgress(conversationId, item.id, 100);

        currentStore = useChatStore.getState().pendingUploads[conversationId] || [];
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

      // ── FIX: 500ms ka delay restore kiya! ──
      // Kyunke ChatArea ab Real Bubble ko tab tak chupayega jab tak Fake Bubble screen par hai.
      // Is liye 500ms delay perfectly smooth swap create karega!
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

  const handleSend = async () => {
    if (!message.trim()) return;

    if (!userId || !secretKey || !activeChat?.conversationId) {
      toast.error("Cannot send message — missing required data.");
      return;
    }

    const text = message.trim();
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await clearTyping({
      conversationId: activeChat.conversationId as Id<"conversations">,
      userId: userId as Id<"users">,
    });

    try {
      if (!otherUser?.publicKey) {
        toast.error("Cannot encrypt — public key missing.");
        setMessage(text);
        return;
      }
      const theirPublicKey = base64ToKey(otherUser.publicKey);
      const { encryptedContent, iv } = encryptMessage(
        text,
        secretKey,
        theirPublicKey,
      );

      await sendMessage({
        conversationId: activeChat.conversationId as Id<"conversations">,
        senderId: userId as Id<"users">,
        encryptedContent,
        iv,
        type: "text",
      });

      const now = Date.now();
      updateLastMessageCache(activeChat.conversationId, {
        text,
        senderId: userId,
        sentAt: now,
        type: "text",
      });
      updateReadByCache(activeChat.conversationId, [
        { userId: userId, time: Date.now() },
      ]);
    } catch (err) {
      toast.error("Failed to send message.");
      setMessage(text);
    }
  };

  if (selectMode) {
    return (
      <div className="px-4 py-3 bg-sidebar border-t border-border transition-colors duration-300">
        <div className="flex items-center justify-between bg-accent rounded-2xl px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            {selectedCount} message{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancelSelect}
              className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-background rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDeleteSelected}
              className="px-4 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasBlockedMe) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            <span className="text-foreground font-semibold">
              {activeChat?.username}
            </span>{" "}
            has blocked you
          </p>
        </div>
      </div>
    );
  }

  if (iBlockedThem) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <ShieldOff size={16} className="text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            You blocked{" "}
            <span className="text-foreground font-semibold">
              {activeChat?.username}
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (friends === undefined || blockedUsers === undefined) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center h-12">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!areFriends) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <UserX size={16} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            You and{" "}
            <span className="text-foreground font-semibold">
              {activeChat?.username}
            </span>{" "}
            are no longer friends
          </p>
        </div>
      </div>
    );
  }

  if (selectedFiles.length > 0) {
    return (
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
          onChange={handleFileChange}
        />
        <PreSendMediaPreview
          files={selectedFiles}
          onSend={handleSendMedia}
          onCancel={handleCancelFile}
          onRemove={handleRemoveFile}
          onAddMore={handleAddMoreFiles}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-sidebar border-t border-border transition-colors duration-300">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
        onChange={handleFileChange}
      />

      <div className="flex items-end gap-2 bg-background border border-border/50 rounded-2xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
        <button
          onClick={handleFileClick}
          className="p-2 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onBlur={() => {
            if (activeChat?.conversationId && userId) {
              clearTyping({
                conversationId:
                  activeChat.conversationId as Id<"conversations">,
                userId: userId as Id<"users">,
              });
            }
          }}
          placeholder="Write a message..."
          className="flex-1 max-h-[120px] min-h-[24px] bg-transparent outline-none resize-none text-[15px] text-foreground placeholder:text-muted-foreground py-2.5 px-2 overflow-y-auto"
          rows={1}
        />

        <button
          className="p-2 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          title="Choose emoji"
        >
          <Smile size={20} />
        </button>

        <button
          onClick={handleSend}
          disabled={!message.trim()}
          title="Send message"
          className={`p-2 mb-0.5 rounded-xl flex-shrink-0 transition-all duration-200 ${
            message.trim()
              ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90 scale-100"
              : "bg-transparent text-muted-foreground opacity-50 cursor-not-allowed scale-95"
          }`}
        >
          <Send size={18} className={message.trim() ? "translate-x-0.5" : ""} />
        </button>
      </div>
    </div>
  );
}