//src/components/chat/ChatListItemWithStatus.tsx
import { useQuery } from "convex/react";
import { useState, useEffect } from "react";
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
  // ── Polling trigger - har 2 seconds mein status check kar ──
  const [pollTrigger, setPollTrigger] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPollTrigger((prev) => prev + 1);
    }, 2000); // 2 second polling

    return () => clearInterval(interval);
  }, []);

  // ── Fetch real-time online status for this user ──
  const userStatus = useQuery(
    api.users.getUserOnlineStatus,
    id ? { userId: id as Id<"users"> } : "skip"
  );

  // Use real-time data if available, fallback to stale data
  const isOnline = userStatus?.isOnline ?? fallbackIsOnline;

  // Force dependency on pollTrigger to ensure re-render
  useEffect(() => {}, [pollTrigger]);

  return <ChatListItem {...props} id={id} isOnline={isOnline} />;
}
