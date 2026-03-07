//src/components/chat/ChatHeader.tsx
import { useChatStore } from "@/store/chatStore";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import { MoreVertical, Timer } from "lucide-react";
import { useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";

export default function ChatHeader() {
  const { activeChat, toggleProfilePanel, profilePanelOpen } = useChatStore();
  
  // ── Polling trigger - har 2 seconds mein status check kar ──
  const [pollTrigger, setPollTrigger] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPollTrigger((prev) => prev + 1);
    }, 2000); // 2 second polling

    return () => clearInterval(interval);
  }, []);

  // ── PRO FIX: Header ko direct Convex se real-time connect karo ──
  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId ? { userId: activeChat.userId as Id<"users"> } : "skip"
  );

  if (!activeChat) return null;

  // Agar real-time data aa gaya hai tou wo use karo, warna store wala fallback
  const isOnlineRealtime = otherUser?.isOnline ?? activeChat.isOnline;

  // Force dependency on pollTrigger
  useEffect(() => {}, [pollTrigger]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={toggleProfilePanel}
      title={profilePanelOpen ? "Close profile" : "View profile"}
    >
      <UserAvatar
        username={activeChat.username}
        profilePicStorageId={
          activeChat.profilePicStorageId as Id<"_storage"> | null
        }
        isOnline={isOnlineRealtime}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <p className="text-foreground font-bold text-sm truncate">
          {activeChat.username}
        </p>
        {activeChat.disappearingMode ? (
          <div className="flex items-center gap-1">
            <Timer size={10} className="text-primary shrink-0" />
            <p className="text-xs font-medium text-primary truncate">
              Disappearing • {activeChat.disappearingTimer === "1h" ? "1 hour"
                : activeChat.disappearingTimer === "6h" ? "6 hours"
                : activeChat.disappearingTimer === "12h" ? "12 hours"
                : activeChat.disappearingTimer === "1d" ? "1 day"
                : activeChat.disappearingTimer === "3d" ? "3 days"
                : activeChat.disappearingTimer === "7d" ? "7 days"
                : ""}
            </p>
          </div>
        ) : (
          <p
            className={`text-xs font-medium ${
              isOnlineRealtime ? "text-emerald-500" : "text-muted-foreground"
            }`}
          >
            {isOnlineRealtime ? "Online" : "Offline"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="View profile options"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}
