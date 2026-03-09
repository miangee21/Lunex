// src/components/chat/input/ChatInput.tsx
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Id } from "../../../../convex/_generated/dataModel";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import PreSendMediaPreview from "@/components/chat/input/PreSendMediaPreview";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import ChatInputStatusBars from "@/components/chat/input/ChatInputStatusBars";
import ReplyPreview from "@/components/chat/bubble/ReplyPreview";
import EmojiPicker from "@/components/chat/input/EmojiPicker";
import ChatInputToolbar from "@/components/chat/input/ChatInputToolbar";
import ChatInputEditingBar from "@/components/chat/input/ChatInputEditingBar";
import { toast } from "sonner";

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

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const {
    activeChat,
    updateLastMessageCache,
    updateReadByCache,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
  } = useChatStore();

  const sendMessage = useMutation(api.messages.sendMessage);
  const editMessage = useMutation(api.messages.editMessage);
  const clearTyping = useMutation(api.typing.clearTyping);

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId && userId
      ? {
          userId: activeChat.userId as Id<"users">,
          viewerId: userId as Id<"users">,
        }
      : "skip",
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
  const isLoadingFriends = friends === undefined || blockedUsers === undefined;

  const {
    selectedFiles,
    handleFileChange,
    handleCancelFile,
    handleRemoveFile,
    handleAddMoreFiles,
    handleSendMedia,
    processBackgroundUploads,
  } = useMediaUpload({
    userId,
    secretKey,
    activeChat,
    otherUserPublicKey: otherUser?.publicKey,
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.text);
      textareaRef.current?.focus();
    } else if (!replyingTo) {
      setMessage("");
    }
  }, [editingMessage]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    return () => {
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

      const pendingItems =
        useChatStore.getState().pendingUploads[conversationId] || [];
      const itemToRetry = pendingItems.find((p) => p.id === itemId);

      if (itemToRetry) {
        useChatStore.getState().updateUploadProgress(conversationId, itemId, 0);
        useChatStore
          .getState()
          .updateUploadStatus(conversationId, itemId, "uploading");
        processBackgroundUploads(
          [itemToRetry],
          conversationId,
          base64ToKey(otherUser.publicKey),
        );
      }
    };

    window.addEventListener("retry-upload", handleRetryEvent);
    return () => window.removeEventListener("retry-upload", handleRetryEvent);
  }, [
    activeChat?.conversationId,
    otherUser?.publicKey,
    secretKey,
    processBackgroundUploads,
  ]);

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!userId || !secretKey || !activeChat?.conversationId) {
      toast.error("Cannot send message — missing required data.");
      return;
    }

    const text = message.trim();
    setMessage("");
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    await clearTyping({
      conversationId: activeChat.conversationId as Id<"conversations">,
      userId: userId as Id<"users">,
    }).catch(console.error);

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

      if (editingMessage) {
        await editMessage({
          messageId: editingMessage.id as Id<"messages">,
          userId: userId as Id<"users">,
          newEncryptedContent: encryptedContent,
          newIv: iv,
        });
        setEditingMessage(null);
      } else {
        await sendMessage({
          conversationId: activeChat.conversationId as Id<"conversations">,
          senderId: userId as Id<"users">,
          encryptedContent,
          iv,
          type: "text",
          replyToMessageId: replyingTo?.id as Id<"messages">,
        });
        setReplyingTo(null);
      }

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
    } catch {
      toast.error("Failed to send message.");
      setMessage(text);
    }
  };

  const showStatusBar =
    selectMode ||
    hasBlockedMe ||
    !!iBlockedThem ||
    isLoadingFriends ||
    !areFriends;

  if (showStatusBar) {
    return (
      <ChatInputStatusBars
        selectMode={selectMode}
        selectedCount={selectedCount}
        onCancelSelect={onCancelSelect}
        onDeleteSelected={onDeleteSelected}
        hasBlockedMe={hasBlockedMe}
        iBlockedThem={!!iBlockedThem}
        isLoading={isLoadingFriends}
        areFriends={areFriends}
        activeChatUsername={activeChat?.username}
      />
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
    <div className="px-4 py-3 bg-sidebar border-t border-border transition-colors duration-300 relative">
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full right-4 mb-2 z-50"
        >
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        </div>
      )}

      <ReplyPreview />

      {editingMessage && (
        <ChatInputEditingBar
          onCancel={() => {
            setEditingMessage(null);
            setMessage("");
          }}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
        onChange={handleFileChange}
      />

      <ChatInputToolbar
        message={message}
        onMessageChange={setMessage}
        onSend={handleSend}
        onEmojiToggle={() => setShowEmojiPicker(!showEmojiPicker)}
        onFileClick={() => fileInputRef.current?.click()}
        showEmojiPicker={showEmojiPicker}
        textareaRef={textareaRef}
      />
    </div>
  );
}
