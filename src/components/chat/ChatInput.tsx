import { useState } from "react";
import { useChatStore } from "@/store/chatStore";
import { Smile, Paperclip, Send, Mic } from "lucide-react";

export default function ChatInput() {
  const { activeChat } = useChatStore();
  const [message, setMessage] = useState("");

  if (!activeChat) return null;

  const isBlocked = false; // Step 11 mein dynamic hoga

  function handleSend() {
    if (!message.trim()) return;
    // Step 11 mein real send hoga
    console.log("Send:", message);
    setMessage("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Blocked state ──
  if (isBlocked) {
    return (
      <div className="px-4 py-4 border-t border-border bg-sidebar flex items-center justify-center">
        <p className="text-muted-foreground text-sm font-medium">
          You cannot send messages to this user
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-border bg-sidebar">
      <div className="flex items-end gap-2 bg-accent rounded-2xl px-3 py-2">

        {/* Emoji button */}
        <button
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mb-0.5"
          title="Emoji (coming soon)"
        >
          <Smile size={20} />
        </button>

        {/* Text input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none max-h-32 py-1.5 min-h-[36px]"
          style={{ height: "auto" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
          }}
        />

        {/* Attachment button */}
        <button
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mb-0.5"
          title="Attach file (coming soon)"
        >
          <Paperclip size={20} />
        </button>

        {/* Send / Mic button */}
        {message.trim() ? (
          <button
            onClick={handleSend}
            className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity flex-shrink-0 mb-0.5"
            title="Send"
          >
            <Send size={16} />
          </button>
        ) : (
          <button
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mb-0.5"
            title="Voice message (coming soon)"
          >
            <Mic size={20} />
          </button>
        )}

      </div>

      {/* Shift+Enter hint */}
      {message.trim() && (
        <p className="text-muted-foreground/50 text-[10px] mt-1 ml-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      )}
    </div>
  );
}