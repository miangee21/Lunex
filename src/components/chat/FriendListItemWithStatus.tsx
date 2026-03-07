//src/components/chat/FriendListItemWithStatus.tsx
import { useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import UserAvatar from "@/components/shared/UserAvatar";

interface FriendListItemProps {
  userId: string;
  username: string;
  profilePicStorageId: string | null;
  isOnline: boolean; // fallback
  onSelect: (isOnline: boolean) => void;
}

export default function FriendListItemWithStatus({
  userId,
  username,
  profilePicStorageId,
  isOnline: fallbackIsOnline,
  onSelect,
}: FriendListItemProps) {
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
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Use real-time data if available, fallback to stale data
  const isOnline = userStatus?.isOnline ?? fallbackIsOnline;

  // Force dependency on pollTrigger to ensure re-render
  useEffect(() => {}, [pollTrigger]);

  return (
    <button
      onClick={() => onSelect(isOnline)}
      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors"
    >
      <UserAvatar
        username={username}
        profilePicStorageId={profilePicStorageId as Id<"_storage"> | null}
        isOnline={isOnline}
      />
      <div className="flex flex-col items-start min-w-0">
        <span className="text-foreground text-sm font-semibold truncate">
          {username}
        </span>
        <span className="text-muted-foreground text-xs">
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
    </button>
  );
}
