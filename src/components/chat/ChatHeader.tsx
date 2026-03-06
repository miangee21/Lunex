//src/components/chat/ChatHeader.tsx
import { useChatStore } from "@/store/chatStore";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import { MoreVertical, Timer } from "lucide-react";

export default function ChatHeader() {
  const { activeChat, toggleProfilePanel, profilePanelOpen } = useChatStore();

  if (!activeChat) return null;

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
        isOnline={activeChat.isOnline}
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
              activeChat.isOnline ? "text-emerald-500" : "text-muted-foreground"
            }`}
          >
            {activeChat.isOnline ? "Online" : "Offline"}
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
