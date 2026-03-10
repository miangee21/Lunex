//src/components/chat/list/ChatListItemWithStatus.tsx
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import ChatListItem from "@/components/chat/list/ChatListItem";
import { useAuthStore } from "@/store/authStore";
import { ReactNode } from "react";

interface ChatListItemWithStatusProps {
  id: string;
  conversationId?: string;
  username: string;
  lastMessage: string | ReactNode;
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

export default function ChatListItemWithStatus({
  id,
  isOnline: fallbackIsOnline,
  conversationId,
  lastMessage,
  ...props
}: ChatListItemWithStatusProps) {
  const currentUserId = useAuthStore((s) => s.userId);

  const userStatus = useQuery(
    api.users.getUserOnlineStatus,
    id && currentUserId
      ? { userId: id as Id<"users">, viewerId: currentUserId as Id<"users"> }
      : "skip",
  );

  const isOnline = userStatus?.isOnline ?? fallbackIsOnline;

  const typingUsers = useQuery(
    api.typing.getTypingUsers,
    conversationId && currentUserId
      ? {
          conversationId: conversationId as Id<"conversations">,
          currentUserId: currentUserId as Id<"users">,
        }
      : "skip",
  );
  const isTyping = typingUsers && typingUsers.length > 0;

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
