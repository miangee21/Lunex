import { useChatStore } from "@/store/chatStore";
import { useState } from "react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import { MoreVertical, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface ChatListItemProps {
  id: string;
  conversationId?: string;
  username: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
  profilePicStorageId?: string | null;
  chatPresetName?: string;
  chatBgColor?: string;
  myBubbleColor?: string;
  otherBubbleColor?: string;
  myTextColor?: string;
  otherTextColor?: string;
  isRead?: "sent" | "delivered" | "read" | undefined;
}

export default function ChatListItem({
  id,
  conversationId,
  username,
  lastMessage,
  time,
  unread,
  isOnline,
  profilePicStorageId,
  chatPresetName,
  chatBgColor,
  myBubbleColor,
  otherBubbleColor,
  myTextColor,
  otherTextColor,
  isRead,
}: ChatListItemProps) {
  const { setActiveChat, setConversationId, activeChat, clearActiveChat } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = activeChat?.userId === id;

  const deleteChat = useMutation(api.conversations.deleteChat);

  async function handleDeleteChat(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId || !conversationId) return;
    try {
      await deleteChat({
        conversationId: conversationId as never,
        userId,
      });
      // Agar ye chat abhi open hai to clear kar do
      if (isActive) clearActiveChat();
      toast.success("Chat deleted!");
      setMenuOpen(false);
    } catch {
      toast.error("Failed to delete chat.");
    }
  }

  return (
    <div
      onClick={() => {
        setActiveChat({
          userId: id,
          username,
          profilePicStorageId: profilePicStorageId ?? null,
          isOnline,
          conversationId: conversationId ?? null,
          chatPresetName,
          chatBgColor,
          myBubbleColor,
          otherBubbleColor,
          myTextColor,
          otherTextColor,
        });
        if (conversationId) setConversationId(conversationId);
      }}
      className={`relative flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors group ${
        isActive ? "bg-accent" : "hover:bg-accent/50"
      }`}
    >
      {/* Avatar */}
      <UserAvatar
        username={username}
        profilePicStorageId={profilePicStorageId as Id<"_storage"> | null}
        size="md"
        isOnline={isOnline}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold text-sm truncate">
            {username}
          </span>
          <span className="text-muted-foreground text-xs flex-shrink-0 ml-1">
            {time}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-muted-foreground text-xs truncate flex items-center gap-1">
            {/* Shape-Based Status Icons */}
            {isRead === "read" && (
              <span className="mr-1 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-primary opacity-100" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </span>
            )}
            {isRead === "delivered" && (
              <span className="mr-1 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-muted-foreground opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5l5 -5" />
                </svg>
              </span>
            )}
            {isRead === "sent" && (
              <span className="mr-1 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-muted-foreground opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </span>
            )}
            {lastMessage}
          </span>
          {unread > 0 && (
            <span className="ml-1 flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
      </div>

      {/* Three dots menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
        >
          <MoreVertical size={15} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 w-36 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
            <button
              onClick={handleDeleteChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} />
              Delete Chat
            </button>
          </div>
        )}
      </div>

      {/* Close menu on outside click */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}