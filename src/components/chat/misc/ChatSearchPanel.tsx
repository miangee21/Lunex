// src/components/chat/misc/ChatSearchPanel.tsx
import { useState, useMemo } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { ArrowLeft, Search, X, MessageSquare, Calendar } from "lucide-react";

export default function ChatSearchPanel() {
  const [query, setQuery] = useState("");
  const setSearchPanelOpen = useChatStore((s) => s.setSearchPanelOpen);
  const currentDecryptedMessages = useChatStore(
    (s) => s.currentDecryptedMessages,
  );
  const activeChat = useChatStore((s) => s.activeChat);
  const currentUserId = useAuthStore((s) => s.userId);

  const filteredMessages = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return currentDecryptedMessages
      .filter((m) => m.text && m.text.toLowerCase().includes(lowerQuery))
      .reverse();
  }, [query, currentDecryptedMessages]);

  const handleJump = (msgId: string) => {
    const element = document.getElementById(`message-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add(
        "bg-primary/20",
        "transition-colors",
        "duration-300",
      );
      setTimeout(() => {
        element.classList.remove("bg-primary/20");
      }, 1500);
    }
  };

  const formatDateTime = (ts: number) => {
    const date = new Date(ts);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (isToday) return time;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
  };

  return (
    <div className="flex flex-col h-full bg-sidebar animate-in slide-in-from-right-4 duration-300 z-50">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40 shrink-0 bg-sidebar/80 backdrop-blur-sm">
        <button
          onClick={() => setSearchPanelOpen(false)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-semibold text-[15px]">
          Search Messages
        </h2>
      </div>

      <div className="p-3 border-b border-border/40 bg-sidebar/50">
        <div className="relative group">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
          />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in chat..."
            className="w-full bg-background border border-border/50 rounded-xl pl-9 pr-9 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {!query.trim() ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70 animate-in fade-in duration-300 pb-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Search size={24} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Search in chat
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-50 leading-relaxed">
              Find messages, links, and text from your conversation with{" "}
              <span className="font-semibold">{activeChat?.username}</span>
            </p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center opacity-70 animate-in fade-in zoom-in-95 duration-200">
            <MessageSquare
              size={32}
              className="text-muted-foreground mb-3 opacity-50"
            />
            <p className="text-sm text-foreground font-medium">
              No results found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No messages match "{query}"
            </p>
          </div>
        ) : (
          <div className="space-y-2 animate-in fade-in duration-300">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              {filteredMessages.length}{" "}
              {filteredMessages.length === 1 ? "Result" : "Results"}
            </p>
            {filteredMessages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const senderName = isMe
                ? "You"
                : activeChat?.username || "Unknown";

              const lowerText = msg.text.toLowerCase();
              const lowerQ = query.toLowerCase();
              const startIndex = lowerText.indexOf(lowerQ);

              const before = msg.text.slice(0, startIndex);
              const match = msg.text.slice(
                startIndex,
                startIndex + query.length,
              );
              const after = msg.text.slice(startIndex + query.length);

              return (
                <div
                  key={msg.id}
                  onClick={() => handleJump(msg.id)}
                  className="group flex flex-col gap-1.5 p-3 rounded-xl bg-background/40 hover:bg-accent/40 border border-transparent hover:border-border/60 cursor-pointer transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span
                      className={`text-xs font-bold ${isMe ? "text-primary" : "text-foreground/80"}`}
                    >
                      {senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Calendar size={10} />
                      {formatDateTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed wrap-break-word">
                    {startIndex >= 0 ? (
                      <>
                        {before}
                        <span className="bg-primary/20 text-primary font-semibold rounded-[3px] px-0.5">
                          {match}
                        </span>
                        {after}
                      </>
                    ) : (
                      msg.text
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
