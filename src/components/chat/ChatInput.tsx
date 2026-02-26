import { useState, useRef, useEffect } from "react";
import { Smile, Paperclip, Send } from "lucide-react";

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea as the user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim()) return;
    console.log("Sending:", message);
    // Real sending logic will go here in Step 11!
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
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
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
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

        {/* ── NEW: Dynamic Send Button ── */}
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
          {/* A tiny translate-x-0.5 makes the send icon look visually centered! */}
          <Send size={18} className={message.trim() ? "translate-x-0.5" : ""} />
        </button>
        
      </div>
    </div>
  );
}