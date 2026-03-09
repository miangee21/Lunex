// src/components/chat/input/ChatInputToolbar.tsx
import { useRef } from "react";
import { Smile, Paperclip, Send, Check } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface ChatInputToolbarProps {
  message: string;
  onMessageChange: (val: string) => void;
  onSend: () => void;
  onEmojiToggle: () => void;
  onFileClick: () => void;
  showEmojiPicker: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function ChatInputToolbar({
  message,
  onMessageChange,
  onSend,
  onEmojiToggle,
  onFileClick,
  showEmojiPicker,
  textareaRef,
}: ChatInputToolbarProps) {
  const { activeChat, editingMessage } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = async () => {
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
  };

  const handleBlur = () => {
    if (activeChat?.conversationId && userId) {
      clearTyping({
        conversationId: activeChat.conversationId as Id<"conversations">,
        userId: userId as Id<"users">,
      });
    }
  };

  return (
    <div className="flex items-end gap-2 bg-background border border-border/50 rounded-2xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
      <button
        onClick={onFileClick}
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
          onMessageChange(val);
          if (val.trim() === "") {
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            if (activeChat?.conversationId && userId) {
              clearTyping({
                conversationId:
                  activeChat.conversationId as Id<"conversations">,
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
            onSend();
          }
        }}
        onBlur={handleBlur}
        placeholder="Write a message..."
        className="flex-1 max-h-30 min-h-6 bg-transparent outline-none resize-none text-[15px] text-foreground placeholder:text-muted-foreground py-2.5 px-2 overflow-y-auto"
        rows={1}
      />

      <button
        onClick={onEmojiToggle}
        className="p-2 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        title="Choose emoji"
      >
        <Smile size={20} className={showEmojiPicker ? "text-primary" : ""} />
      </button>

      <button
        onClick={onSend}
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
          <Send size={18} className={message.trim() ? "translate-x-0.5" : ""} />
        )}
      </button>
    </div>
  );
}
