//src/hooks/useOnlineStatus.ts
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Hook to fetch real-time online status for a user
 * @param userId - The user ID to fetch status for (can be null/undefined to skip)
 * @param viewerId - The viewing user's ID for privacy checks
 * @returns Object containing isOnline and lastSeen, or null if user not found
 */
export function useOnlineStatus(
  userId: string | null | undefined,
  viewerId: string | null | undefined,
) {
  const userStatus = useQuery(
    api.users.getUserOnlineStatus,
    userId && viewerId
      ? { userId: userId as Id<"users">, viewerId: viewerId as Id<"users"> }
      : "skip",
  );

  return userStatus;
}
