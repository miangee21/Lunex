// src/hooks/useAppNotifications.ts
import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Id } from "../../convex/_generated/dataModel";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export function useAppNotifications() {
  const userId = useAuthStore((s) => s.userId);

  const userSettings = useQuery(
    api.presence.getUserSettings,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const conversations = useQuery(
    api.conversations.getConversationsList,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const pendingRequests = useQuery(
    api.friends.getIncomingRequests,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const isInitialLoad = useRef(true);
  const prevUnreadMap = useRef<Record<string, number>>({});
  const prevReqCount = useRef<number>(0);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const hasPermission = await isPermissionGranted();
        if (hasPermission) return true;

        const permission = await requestPermission();
        return permission === "granted";
      } catch (error) {
        console.error("Tauri notification API error:", error);
        return false;
      }
    }

    const handleNotifications = async () => {
      if (
        !userSettings ||
        conversations === undefined ||
        pendingRequests === undefined
      )
        return;

      if (isInitialLoad.current) {
        conversations.forEach((conv) => {
          if (conv)
            prevUnreadMap.current[conv.conversationId] = conv.unreadCount;
        });
        prevReqCount.current = pendingRequests.length;
        isInitialLoad.current = false;

        updateAppBadge(conversations, pendingRequests.length);
        return;
      }

      const hasPermission = await checkPermissions();
      if (!hasPermission) return;

      const privacy = userSettings.privacyNotifications ?? "everyone";
      const exceptions = userSettings.notificationExceptions ?? [];

      for (const conv of conversations) {
        if (!conv) continue;
        const prevUnread = prevUnreadMap.current[conv.conversationId] || 0;

        if (conv.unreadCount > prevUnread) {
          let canNotify = true;

          if (privacy === "nobody") {
            canNotify = false;
          } else if (privacy === "only_these") {
            canNotify = exceptions.includes(conv.otherUserId);
          } else if (privacy === "all_except") {
            canNotify = !exceptions.includes(conv.otherUserId);
          }

          if (canNotify) {
            sendNotification({
              title: "Lunex",
              body: `New message from ${conv.username}`,
            });
          }
        }

        prevUnreadMap.current[conv.conversationId] = conv.unreadCount;
      }

      const currentReqCount = pendingRequests.length;
      if (currentReqCount > prevReqCount.current) {
        if (privacy !== "nobody") {
          sendNotification({
            title: "Lunex",
            body: "You have a new friend request!",
          });
        }
      }
      prevReqCount.current = currentReqCount;

      updateAppBadge(conversations, currentReqCount);
    };

    handleNotifications();
  }, [conversations, pendingRequests, userSettings]);

  function updateAppBadge(convs: any[], reqCount: number) {
    const totalUnread = convs.reduce(
      (acc, curr) => acc + (curr?.unreadCount || 0),
      0,
    );
    const totalBadgeCount = totalUnread + reqCount;

    if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
      try {
        if (totalBadgeCount > 0) {
          (navigator as any).setAppBadge(totalBadgeCount);
        } else {
          (navigator as any).clearAppBadge();
        }
      } catch (e) {
        console.error("Badge update failed", e);
      }
    }
  }
}
