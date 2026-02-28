import { useState, useRef, useEffect } from "react";
import { Smile, Paperclip, Send, UserX, ShieldOff, Shield, X, FileText, ImageIcon, Video } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Id } from "../../../convex/_generated/dataModel";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { encryptMediaFile } from "@/crypto/mediaEncryption";
import { toast } from "sonner";
import { validateFile, formatFileSize, type AllowedFileType } from "@/lib/fileValidation";
import MediaUploadProgress from "@/components/chat/MediaUploadProgress";

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

  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; type: AllowedFileType }>>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);

  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const { activeChat, updateLastMessageCache, updateReadByCache } = useChatStore();

  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId ? { userId: activeChat.userId as never } : "skip"
  );

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip"
  );
  const blockedUsers = useQuery(
    api.friends.getBlockedUsers,
    userId ? { userId } : "skip"
  );

  const friendship = friends?.find((f) => f?.userId === activeChat?.userId);
  const iBlockedThem = blockedUsers?.find((b) => b.userId === activeChat?.userId);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (files.length > 10) {
      toast.error("Maximum 10 files at a time.");
      e.target.value = "";
      return;
    }

    const valid: Array<{ file: File; type: AllowedFileType }> = [];
    files.forEach((file) => {
      const result = validateFile(file);
      if (!result.valid) {
        toast.error(`${file.name}: ${result.error}`);
      } else {
        valid.push({ file, type: result.type! });
      }
    });

    if (valid.length > 0) setSelectedFiles(valid);
    e.target.value = "";
  }

  function handleCancelFile() {
    setSelectedFiles([]);
    setUploadProgress(0);
    setIsUploading(false);
    setCurrentUploadIndex(0);
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function FilePreviewIcon({ type }: { type: AllowedFileType }) {
    if (type === "image") return <ImageIcon size={18} className="text-primary" />;
    if (type === "video") return <Video size={18} className="text-primary" />;
    return <FileText size={18} className="text-primary" />;
  }

  async function handleSendMedia() {
    if (!selectedFiles.length) return;
    if (!userId || !secretKey || !activeChat?.conversationId) {
      toast.error("Cannot send — missing required data.");
      return;
    }
    if (!otherUser?.publicKey) {
      toast.error("Cannot encrypt — public key missing.");
      return;
    }

    setIsUploading(true);
    const theirPublicKey = base64ToKey(otherUser.publicKey);

    for (let i = 0; i < selectedFiles.length; i++) {
      const { file, type } = selectedFiles[i];
      setCurrentUploadIndex(i);
      setUploadProgress(10);

      try {
        // 1 — Get upload URL
        const uploadUrl = await generateUploadUrl();
        setUploadProgress(20);

        // 2 — Encrypt file
        const { encryptedBlob, iv: mediaIv } = await encryptMediaFile(
          file,
          secretKey,
          theirPublicKey
        );
        setUploadProgress(50);

        // 3 — Upload encrypted blob
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: encryptedBlob,
        });

        if (!uploadRes.ok) throw new Error("Upload failed");
        setUploadProgress(70);

        const { storageId } = await uploadRes.json();

        // 4 — Encrypt filename
        const { encryptedContent, iv } = encryptMessage(
          file.name,
          secretKey,
          theirPublicKey
        );

        setUploadProgress(90);

        // 5 — Send message
        await sendMessage({
          conversationId: activeChat.conversationId as Id<"conversations">,
          senderId: userId as Id<"users">,
          encryptedContent,
          iv,
          type,
          mediaStorageId: storageId as Id<"_storage">,
          mediaIv,
          mediaOriginalName: file.name,
        });

        setUploadProgress(100);

        // Last file ka cache update
        if (i === selectedFiles.length - 1) {
          const now = Date.now();
          updateLastMessageCache(activeChat.conversationId, {
            text: file.name,
            senderId: userId,
            sentAt: now,
            type,
          });
          updateReadByCache(activeChat.conversationId, [{ userId: userId, time: now }]);
        }

      } catch (err) {
        toast.error(`Failed to send ${file.name}`);
      }
    }

    setTimeout(() => {
      setSelectedFiles([]);
      setUploadProgress(0);
      setIsUploading(false);
      setCurrentUploadIndex(0);
    }, 500);
  }

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
      const { encryptedContent, iv } = encryptMessage(text, secretKey, theirPublicKey);

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
      updateReadByCache(activeChat.conversationId, [{ userId: userId, time: Date.now() }]);
    } catch (err) {
      toast.error("Failed to send message.");
      setMessage(text);
    }
  };

  // ── SELECT MODE ──
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

  // ── BLOCKED BY THEM ──
  if (hasBlockedMe) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            <span className="text-foreground font-semibold">{activeChat?.username}</span> has blocked you
          </p>
        </div>
      </div>
    );
  }

  // ── I BLOCKED THEM ──
  if (iBlockedThem) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <ShieldOff size={16} className="text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            You blocked <span className="text-foreground font-semibold">{activeChat?.username}</span>
          </p>
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (friends === undefined || blockedUsers === undefined) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center h-12">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // ── NOT FRIENDS ──
  if (!areFriends) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <UserX size={16} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            You and <span className="text-foreground font-semibold">{activeChat?.username}</span> are no longer friends
          </p>
        </div>
      </div>
    );
  }

  // ── UPLOADING ──
  if (isUploading) {
    return (
      <MediaUploadProgress
        fileName={selectedFiles[currentUploadIndex]?.file.name ?? ""}
        progress={uploadProgress}
        type={selectedFiles[currentUploadIndex]?.type ?? "file"}
        uploadIndex={currentUploadIndex + 1}
        uploadTotal={selectedFiles.length}
      />
    );
  }

  // ── FILES SELECTED PREVIEW ──
  if (selectedFiles.length > 0) {
    return (
      <div className="px-4 py-3 bg-sidebar border-t border-border">
        <div className="flex flex-col gap-2 mb-3 max-h-[200px] overflow-y-auto">
          {selectedFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-accent rounded-xl px-3 py-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FilePreviewIcon type={item.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {item.file.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatFileSize(item.file.size)}
                </p>
              </div>
              <button
                onClick={() => handleRemoveFile(index)}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCancelFile}
            className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendMedia}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Send size={16} />
            Send {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"}
          </button>
        </div>
      </div>
    );
  }

  // ── NORMAL INPUT ──
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
                conversationId: activeChat.conversationId as Id<"conversations">,
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