//src/components/chat/ChatListItemWithStatus.tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ChatListItem from "@/components/chat/ChatListItem";

interface ChatListItemWithStatusProps {
  id: string;
  conversationId?: string;
  username: string;
  lastMessage: string;
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
  ...props
}: ChatListItemWithStatusProps) {
// ── Fetch real-time online status for this user ──
  const userStatus = useQuery(
    api.users.getUserOnlineStatus,
    id ? { userId: id as Id<"users"> } : "skip"
  );

  // Use real-time data if available, fallback to stale data
  const isOnline = userStatus?.isOnline ?? fallbackIsOnline;

  return <ChatListItem {...props} id={id} isOnline={isOnline} />;
}
