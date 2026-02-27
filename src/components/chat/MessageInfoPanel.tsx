import { X, CalendarDays, Clock } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface MessageInfoPanelProps {
  messageId: string;
  messageText: string;
}

export default function MessageInfoPanel({ messageId, messageText }: MessageInfoPanelProps) {
  const { activeChat, setSelectedMessageForInfo } = useChatStore();
  const currentUserId = useAuthStore((s) => s.userId);
  
  const messages = useQuery(
    api.messages.getMessages,
    activeChat?.conversationId && currentUserId
      ? {
          conversationId: activeChat.conversationId as Id<"conversations">,
          userId: currentUserId as Id<"users">,
        }
      : "skip"
  );

  const msg = messages?.find((m) => m.id === messageId);
  const otherUserId = activeChat?.userId;

  const deliveredRecord = msg?.deliveredTo?.find((d) => d.userId === otherUserId);
  const readRecord = msg?.readBy?.find((r) => r.userId === otherUserId);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ════════════════════════════════════════════════════════════════════════
  // ── FIX: EXACT SAME THEME INJECTION AS CHATAREA ──
  // ════════════════════════════════════════════════════════════════════════
  const themeClass = activeChat?.chatPresetName
    ? `theme-${activeChat.chatPresetName.toLowerCase()}`
    : "";

  const customThemeStyles = {
    ...(activeChat?.chatBgColor && {
      "--background": activeChat.chatBgColor,
      "--sidebar": activeChat.chatBgColor,
    }),
    ...(activeChat?.myBubbleColor && { "--primary": activeChat.myBubbleColor }),
    ...(activeChat?.otherBubbleColor && { "--secondary": activeChat.otherBubbleColor }),
    ...(activeChat?.myTextColor && { "--primary-foreground": activeChat.myTextColor }),
    ...(activeChat?.otherTextColor && { "--secondary-foreground": activeChat.otherTextColor }),
  } as React.CSSProperties;
  // ════════════════════════════════════════════════════════════════════════

  if (!msg) {
    return (
      <div 
        className={`h-full flex items-center justify-center bg-background/60 backdrop-blur-2xl border-l border-border/50 ${themeClass}`}
        style={customThemeStyles}
      >
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Loading details...</p>
        </div>
      </div>
    );
  }

  return (
    // ── THEME FIX: themeClass aur customThemeStyles yahan apply kar diye ──
    <div 
      className={`h-full flex flex-col bg-background/60 backdrop-blur-2xl border-l border-border/50 animate-in slide-in-from-right duration-300 ${themeClass}`}
      style={customThemeStyles}
    >
      
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/50 bg-card/30">
        <h2 className="font-semibold text-foreground tracking-wide">Message Info</h2>
        <button
          onClick={() => setSelectedMessageForInfo(null)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        
        {/* ── ACTUAL DECRYPTED BUBBLE ── */}
        <div className="flex flex-col items-end mb-10">
          <div 
            className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-md relative bg-primary text-primary-foreground"
          >
            <p className="text-[15px] leading-relaxed break-words">
              {/* ── FIX: Newlines remove kiye aur 40 characters ki limit laga di ── */}
              {messageText.replace(/\n/g, " ").length > 40 
                ? messageText.replace(/\n/g, " ").substring(0, 40) + "..." 
                : messageText.replace(/\n/g, " ")
              }
            </p>
            <div className="flex items-center justify-end gap-1 mt-1 opacity-80">
              <span className="text-[11px] font-medium">{formatTime(msg.sentAt)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {formatDate(msg.sentAt)}
          </h3>

          <div className="relative pl-6 border-l-2 border-border/40 space-y-8 ml-2">
            
            {/* SEEN */}
            <div className="relative">
              <div 
                // ── MAGIC: text-primary khud chat theme ka color le lega ──
                className={`absolute -left-[35px] top-0.5 p-1 rounded-full bg-background ${
                  readRecord ? "text-primary" : "text-muted-foreground/30"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={readRecord ? "currentColor" : "none"} stroke="currentColor" strokeWidth={readRecord ? 0 : 2}>
                  {readRecord ? (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  ) : (
                    <circle cx="12" cy="12" r="10" />
                  )}
                </svg>
              </div>
              <div>
                <p className={`font-medium ${readRecord ? "text-foreground" : "text-muted-foreground"}`}>Read</p>
                {readRecord && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {formatTime(readRecord.time)}
                  </p>
                )}
              </div>
            </div>

            {/* DELIVERED */}
            <div className="relative">
              <div className={`absolute -left-[35px] top-0.5 p-1 rounded-full bg-background ${deliveredRecord ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  {deliveredRecord && <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5l5 -5" />}
                </svg>
              </div>
              <div>
                <p className={`font-medium ${deliveredRecord ? "text-foreground" : "text-muted-foreground"}`}>Delivered</p>
                {deliveredRecord && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {formatTime(deliveredRecord.time)}
                  </p>
                )}
              </div>
            </div>

            {/* SENT */}
            <div className="relative">
              <div className="absolute -left-[35px] top-0.5 p-1 rounded-full bg-background text-muted-foreground">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Sent</p>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {formatTime(msg.sentAt)}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}