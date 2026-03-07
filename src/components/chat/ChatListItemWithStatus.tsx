//src/components/chat/ChatListItemWithStatus.tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ChatListItem from "@/components/chat/ChatListItem";
import { useAuthStore } from "@/store/authStore";
import { ReactNode } from "react";

interface ChatListItemWithStatusProps {
  id: string;
  conversationId?: string;
  username: string;
  lastMessage: string | ReactNode;
  time: string;
  unread: number;
  isOnline: boolean; // fallback
  profilePicStorageId?: string | null;
  chatPresetName?: string;
  chatBgColor?: string;
  myBubbleColor?: string;
  otherBubbleColor?: string;
  myTextColor?: string;
  otherTextColor?: string;
  isRead?: "sent" | "delivered" | "read" | undefined;
}

export default function ChatListItemWithStatus({
  id,
  isOnline: fallbackIsOnline,
  conversationId,
  lastMessage,
  ...props
}: ChatListItemWithStatusProps) {
  const currentUserId = useAuthStore((s) => s.userId);

  // ── Fetch real-time online status for this user ──
  const userStatus = useQuery(
    api.users.getUserOnlineStatus,
    id ? { userId: id as Id<"users"> } : "skip"
  );

  // Use real-time data if available, fallback to stale data
  const isOnline = userStatus?.isOnline ?? fallbackIsOnline;

  // ── FIX: Real-time check for sidebar typing indicator ──
  const typingUsers = useQuery(
    api.typing.getTypingUsers,
    conversationId && currentUserId
      ? {
          conversationId: conversationId as Id<"conversations">,
          currentUserId: currentUserId as Id<"users">,
        }
      : "skip"
  );
  const isTyping = typingUsers && typingUsers.length > 0;

  // Agar typing chal rahi hai tou last message ki jagah typing dikhao
  const displayMessage = isTyping ? (
    <span className="text-emerald-500 animate-pulse font-medium tracking-wide">
      typing...
    </span>
  ) : (
    lastMessage
  );

  return (
    <ChatListItem
      {...props}
      id={id}
      conversationId={conversationId}
      isOnline={isOnline}
      lastMessage={displayMessage as any}
    />
  );
}