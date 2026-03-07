//src/components/chat/FriendListItemWithStatus.tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import UserAvatar from "@/components/shared/UserAvatar";
import { useAuthStore } from "@/store/authStore";

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
  const currentUserId = useAuthStore((s) => s.userId);

// ── Fetch real-time online status for this user ──
  const userStatus = useQuery(
    api.users.getUserOnlineStatus,
    userId && currentUserId ? { userId: userId as Id<"users">, viewerId: currentUserId as Id<"users"> } : "skip"
  );

  // Use real-time data if available, fallback to stale data
  const isOnline = userStatus?.isOnline ?? fallbackIsOnline;

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
