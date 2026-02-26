import { useState, useRef, useEffect } from "react";
import { Smile, Paperclip, Send } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Id } from "../../../convex/_generated/dataModel";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { toast } from "sonner";

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const { activeChat } = useChatStore();

  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);

  const otherUser = useQuery(
  api.users.getUserById,
  activeChat?.userId ? { userId: activeChat.userId as never } : "skip"
);

  // Typing timeout ref
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize the textarea as the user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Clear typing on unmount
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

    // Set typing true
    await setTyping({
      conversationId: activeChat.conversationId as Id<"conversations">,
      userId: userId as Id<"users">,
      isTyping: true,
    });

    // Clear after 5 seconds of inactivity
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
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Clear typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await clearTyping({
      conversationId: activeChat.conversationId as Id<"conversations">,
      userId: userId as Id<"users">,
    });

    try {
      // Encrypt the message
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
    } catch (err) {
      toast.error("Failed to send message.");
      setMessage(text); // Restore message on error
    }
  };

  return (
    <div className="px-4 py-3 bg-sidebar border-t border-border transition-colors duration-300">
      <div className="flex items-end gap-2 bg-background border border-border/50 rounded-2xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">

        {/* Attachment Button */}
        <button
          className="p-2 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        {/* Auto-resizing Text Input */}
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

        {/* Emoji Button */}
        <button
          className="p-2 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          title="Choose emoji"
        >
          <Smile size={20} />
        </button>

        {/* Dynamic Send Button */}
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