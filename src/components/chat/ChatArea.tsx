import { useState, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore"; // ── NEW: Imported Auth Store
import { useQuery } from "convex/react"; // ── NEW: Imported Convex Query
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/ChatBubble";
import { CheckSquare, X } from "lucide-react";

// Dummy messages
const DUMMY_MESSAGES = [
  {
    id: "1",
    senderId: "other",
    text: "Hey! How are you doing?",
    time: "10:30 AM",
    isOwn: false,
  },
  {
    id: "2",
    senderId: "me",
    text: "I'm doing great! Just testing this awesome app 🚀",
    time: "10:31 AM",
    isOwn: true,
  },
  {
    id: "3",
    senderId: "other",
    text: "Lunex looks amazing so far! I really love how you added the custom themes, they look just like Signal and Telegram. It gives the app such a premium feel compared to standard web apps. What are you going to build next?",
    time: "10:32 AM",
    isOwn: false,
  },
  {
    id: "4",
    senderId: "me",
    text: "Thanks! Built with love ❤️ Wait until you see the backend wired up in Step 11!",
    time: "10:33 AM",
    isOwn: true,
  },
];

export default function ChatArea() {
  const { activeChat, clearActiveChat, syncChatTheme } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  
  // ── STATE: Custom Context Menu ──
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Close the right-click menu if the user clicks anywhere else on the screen
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // ── NEW: CLOUD SYNC LOGIC FOR PER-CHAT THEMES ──
  // ════════════════════════════════════════════════════════════════════════
  
  // 1. Fetch the theme for this specific chat from Convex
  const cloudTheme = useQuery(
    api.chatThemes.getChatTheme,
    userId && activeChat?.userId
      ? { 
          userId: userId as Id<"users">, 
          otherUserId: activeChat.userId as Id<"users"> 
        }
      : "skip"
  );

  // 2. Automatically sync it to the Zustand store when data arrives
  useEffect(() => {
    if (userId && activeChat?.userId && cloudTheme !== undefined) {
      // Extract only the theme properties, or fallback to undefined to clear it
      const themeData = cloudTheme ? {
        chatPresetName: cloudTheme.chatPresetName,
        chatBgColor: cloudTheme.chatBgColor,
        myBubbleColor: cloudTheme.myBubbleColor,
        otherBubbleColor: cloudTheme.otherBubbleColor,
        myTextColor: cloudTheme.myTextColor,
        otherTextColor: cloudTheme.otherTextColor,
      } : {
        chatPresetName: undefined,
        chatBgColor: undefined,
        myBubbleColor: undefined,
        otherBubbleColor: undefined,
        myTextColor: undefined,
        otherTextColor: undefined,
      };

      // Push to Zustand store (this updates the screen instantly)
      syncChatTheme(userId, activeChat.userId, themeData);
    }
  }, [cloudTheme, userId, activeChat?.userId, syncChatTheme]);

  // ════════════════════════════════════════════════════════════════════════

  if (!activeChat) return null;

  // ── 1. PRESET THEME CLASS ──
  const themeClass = activeChat.chatPresetName 
    ? `theme-${activeChat.chatPresetName.toLowerCase()}` 
    : "";

  // ── 2. CUSTOM OVERRIDES ──
  const customThemeStyles = {
    ...(activeChat.chatBgColor && { "--background": activeChat.chatBgColor, "--sidebar": activeChat.chatBgColor }),
    ...(activeChat.myBubbleColor && { "--primary": activeChat.myBubbleColor }),
    ...(activeChat.otherBubbleColor && { "--secondary": activeChat.otherBubbleColor }),
    ...(activeChat.myTextColor && { "--primary-foreground": activeChat.myTextColor }),
    ...(activeChat.otherTextColor && { "--secondary-foreground": activeChat.otherTextColor }),
  } as React.CSSProperties;

  return (
    <div 
      className={`flex-1 flex flex-col min-w-0 bg-background transition-colors duration-300 relative ${themeClass}`}
      style={customThemeStyles}
      onContextMenu={(e) => e.preventDefault()}
    >

      {/* Header */}
      <ChatHeader />

      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
        onContextMenu={(e) => {
          e.preventDefault(); 
          setContextMenu({ x: e.clientX, y: e.clientY }); 
        }}
      >
        {DUMMY_MESSAGES.map((msg) => (
          <div 
            key={msg.id} 
            onContextMenu={(e) => {
              e.preventDefault();  
              e.stopPropagation(); 
            }} 
          >
            <MessageBubble
              text={msg.text}
              time={msg.time}
              isOwn={msg.isOwn}
            />
          </div>
        ))}
      </div>

      {/* Input */}
      <ChatInput />

      {/* ── Right-Click Custom Context Menu UI ── */}
      {contextMenu && (
        <div 
          className="fixed z-50 w-48 bg-card border border-border shadow-xl rounded-xl overflow-hidden animate-in fade-in-80 zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              console.log("Select messages clicked");
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <CheckSquare size={14} className="text-muted-foreground" />
            Select messages
          </button>
          
          <div className="h-px bg-border w-full" />
          
          <button 
            onClick={() => {
              clearActiveChat();
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <X size={14} />
            Close chat
          </button>
        </div>
      )}

    </div>
  );
}