//src/components/chat/list/ChatListItem.tsx
import { useChatStore } from "@/store/chatStore";
import { useState } from "react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../../convex/_generated/dataModel";
import { MoreVertical, Trash2, Pin, Check } from "lucide-react";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
  isPinned?: boolean;
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
  isPinned,
}: ChatListItemProps) {
  const {
    setActiveChat,
    setConversationId,
    activeChat,
    clearActiveChat,
    isSelectionMode,
    selectedChats,
    toggleChatSelection,
  } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = !isSelectionMode && activeChat?.userId === id;
  const deleteChat = useMutation(api.conversations.deleteChat);
  const togglePinChat = useMutation(api.users.togglePinChat);

  const isSelected = conversationId
    ? selectedChats.includes(conversationId)
    : false;

  async function handlePinChat(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId || !conversationId) return;
    try {
      const res = await togglePinChat({
        conversationId: conversationId as Id<"conversations">,
        userId: userId as Id<"users">,
      });
      if (res.success) {
        toast.success(res.isPinned ? "Chat pinned!" : "Chat unpinned!");
      } else if (res.error) {
        toast.error(res.error);
      }
      setMenuOpen(false);
    } catch {
      toast.error("Failed to pin chat.");
    }
  }

  async function handleDeleteChat() {
    if (!userId || !conversationId) return;
    try {
      await deleteChat({
        conversationId: conversationId as never,
        userId,
      });

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
        if (isSelectionMode) {
          if (conversationId) toggleChatSelection(conversationId);
          return;
        }
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
        isActive
          ? "bg-accent"
          : isSelected
            ? "bg-primary/10"
            : "hover:bg-accent/50"
      }`}
    >
      {isSelectionMode && (
        <div
          className={`shrink-0 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200
          ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"}
        `}
        >
          {isSelected && (
            <Check
              size={12}
              strokeWidth={3}
              className="text-primary-foreground"
            />
          )}
        </div>
      )}

      <UserAvatar
        username={username}
        profilePicStorageId={profilePicStorageId as Id<"_storage"> | null}
        size="md"
        isOnline={isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold text-sm truncate">
            {username}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {isPinned && (
              <Pin size={12} className="text-muted-foreground rotate-45" />
            )}
            <span className="text-muted-foreground text-xs">{time}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-muted-foreground text-xs truncate flex items-center gap-1">
            {isRead === "read" && (
              <span className="mr-1 shrink-0">
                <svg
                  className="w-3.5 h-3.5 text-primary opacity-100"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </span>
            )}
            {isRead === "delivered" && (
              <span className="mr-1 shrink-0">
                <svg
                  className="w-3.5 h-3.5 text-muted-foreground opacity-80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12.5l2.5 2.5l5 -5"
                  />
                </svg>
              </span>
            )}
            {isRead === "sent" && (
              <span className="mr-1 shrink-0">
                <svg
                  className="w-3.5 h-3.5 text-muted-foreground opacity-80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </span>
            )}
            {lastMessage}
          </span>
          {unread > 0 && (
            <span className="ml-1 shrink-0 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
      </div>

      {!isSelectionMode && (
        <div className="relative shrink-0">
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
            <div className="absolute right-0 top-8 w-40 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
              <button
                onClick={handlePinChat}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-accent/50 transition-colors"
              >
                <Pin
                  size={15}
                  className={isPinned ? "fill-muted-foreground" : ""}
                />
                {isPinned ? "Unpin Chat" : "Pin Chat"}
              </button>

              <div className="h-px bg-border/40 mx-2" />

              <div onClick={(e) => e.stopPropagation()}>
                <ConfirmModal
                  title="Delete Chat?"
                  description="Are you sure you want to delete this chat? This action cannot be undone."
                  isDestructive={true}
                  confirmText="Delete"
                  onConfirm={() => {
                    handleDeleteChat();
                    setMenuOpen(false);
                  }}
                >
                  <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 size={15} />
                    Delete Chat
                  </button>
                </ConfirmModal>
              </div>
            </div>
          )}
        </div>
      )}

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
