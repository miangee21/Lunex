import { useChatStore } from "@/store/chatStore";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import { MoreVertical } from "lucide-react";

export default function ChatHeader() {
  const { activeChat, toggleProfilePanel, profilePanelOpen } = useChatStore();

  if (!activeChat) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={toggleProfilePanel}
      title={profilePanelOpen ? "Close profile" : "View profile"}
    >
      {/* Avatar + online */}
      <UserAvatar
        username={activeChat.username}
        profilePicStorageId={activeChat.profilePicStorageId as Id<"_storage"> | null}
        isOnline={activeChat.isOnline}
        size="md"
      />

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-bold text-sm truncate">
          {activeChat.username}
        </p>
        <p className={`text-xs font-medium ${
          activeChat.isOnline
            ? "text-emerald-500"
            : "text-muted-foreground"
        }`}>
          {activeChat.isOnline ? "Online" : "Offline"}
        </p>
      </div>

      {/* Action buttons */}
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