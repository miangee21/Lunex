//src/components/chat/ChatInput.tsx
import { useState, useRef, useEffect } from "react";
import { Smile, Paperclip, Send, Check, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Id } from "../../../convex/_generated/dataModel";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { toast } from "sonner";
import PreSendMediaPreview from "@/components/chat/PreSendMediaPreview";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import ChatInputStatusBars from "@/components/chat/ChatInputStatusBars";
import ReplyPreview from "@/components/chat/ReplyPreview";
import EmojiPicker from "@/components/chat/EmojiPicker";

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
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);

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
  const isLoadingFriends = friends === undefined || blockedUsers === undefined;

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

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

    // ── FIX: Send karte waqt har tarah ka typing data foran urra do ──
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    await clearTyping({
      conversationId: activeChat.conversationId as Id<"conversations">,
      userId: userId as Id<"users">,
    }).catch(console.error); // Error aane pe message send hona nahi rukna chahiye

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
    } catch (err) {
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
        <div className="flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur-sm border-t border-border shadow-sm mb-2 rounded-xl mx-4">
          <div className="flex-1 min-w-0 flex items-center gap-2 text-primary">
            <Check size={14} />
            <span className="text-sm font-semibold">Editing Message</span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setMessage("");
            }}
            className="w-7 h-7 flex shrink-0 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors ml-3"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
          onClick={() => fileInputRef.current?.click()}
          className="p-2 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            const val = e.target.value;
            setMessage(val);
            
            // ── PRO FIX: Agar input khali ho gaya tou timer ka wait mat karo, foran clear karo ──
            if (val.trim() === "") {
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (activeChat?.conversationId && userId) {
                clearTyping({
                  conversationId: activeChat.conversationId as Id<"conversations">,
                  userId: userId as Id<"users">,
                });
              }
            } else {
              handleTyping();
            }
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
          className="flex-1 max-h-30 min-h-6 bg-transparent outline-none resize-none text-[15px] text-foreground placeholder:text-muted-foreground py-2.5 px-2 overflow-y-auto"
          rows={1}
        />

        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          title="Choose emoji"
        >
          <Smile size={20} className={showEmojiPicker ? "text-primary" : ""} />
        </button>

        <button
          onClick={handleSend}
          disabled={!message.trim()}
          title={editingMessage ? "Update message" : "Send message"}
          className={`p-2 mb-0.5 rounded-xl shrink-0 transition-all duration-200 ${
            message.trim()
              ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90 scale-100"
              : "bg-transparent text-muted-foreground opacity-50 cursor-not-allowed scale-95"
          }`}
        >
          {editingMessage ? (
            <Check size={18} strokeWidth={3} />
          ) : (
            <Send
              size={18}
              className={message.trim() ? "translate-x-0.5" : ""}
            />
          )}
        </button>
      </div>
    </div>
  );
}
