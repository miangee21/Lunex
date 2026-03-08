// src/hooks/useAppNotifications.ts
import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Id } from "../../convex/_generated/dataModel";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

export function useAppNotifications() {
  const userId = useAuthStore((s) => s.userId);

  // ── 1. Fetch Privacy Settings ──
  const userSettings = useQuery(
    api.presence.getUserSettings,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // ── 2. Fetch Conversations (for unread counts) ──
  const conversations = useQuery(
    api.conversations.getConversationsList,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // ── 3. Fetch Friend Requests ──
  const pendingRequests = useQuery(
    api.friends.getIncomingRequests, // ── FIX: Updated to correct API name ──
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Initial load ko track karne ke liye refs (taake app open hotay hi puranay messages ki notifications na ayen)
  const isInitialLoad = useRef(true);
  const prevUnreadMap = useRef<Record<string, number>>({});
  const prevReqCount = useRef<number>(0);

  useEffect(() => {
    // Permission check for OS Notifications
    async function checkPermissions() {
      try {
        const hasPermission = await isPermissionGranted();
        if (hasPermission) return true;
        
        const permission = await requestPermission();
        return permission === "granted"; // ── FIX: Tauri v2 returns a string state ──
      } catch (error) {
        console.error("Tauri notification API error:", error);
        return false;
      }
    }

    const handleNotifications = async () => {
      // Agar data load nahi hua ya user null hai toh wait karo
      if (!userSettings || conversations === undefined || pendingRequests === undefined) return;

      // ── PREVENT SPAM ON INITIAL LOAD ──
      if (isInitialLoad.current) {
        conversations.forEach((conv) => {
          if (conv) prevUnreadMap.current[conv.conversationId] = conv.unreadCount; // ── FIX: Null Check ──
        });
        prevReqCount.current = pendingRequests.length;
        isInitialLoad.current = false;
        
        // Initial badge set kar do
        updateAppBadge(conversations, pendingRequests.length);
        return;
      }

      const hasPermission = await checkPermissions();
      if (!hasPermission) return;

      const privacy = userSettings.privacyNotifications ?? "everyone";
      const exceptions = userSettings.notificationExceptions ?? [];

      // ── PROCESS NEW MESSAGES ──
      for (const conv of conversations) {
        if (!conv) continue; // ── FIX: Null Check ──
        const prevUnread = prevUnreadMap.current[conv.conversationId] || 0;
        
        // Agar naya message aya hai
        if (conv.unreadCount > prevUnread) {
          let canNotify = true;
          
          // Privacy Logic
          if (privacy === "nobody") {
            canNotify = false;
          } else if (privacy === "only_these") {
            // Whitelist: Sirf unko allow karo jo list mein hain
            canNotify = exceptions.includes(conv.otherUserId);
          } else if (privacy === "all_except") {
            // Blacklist: Unko block karo jo list mein hain
            canNotify = !exceptions.includes(conv.otherUserId);
          }

          if (canNotify) {
            // Native OS Notification (Encrypted / No Content)
            sendNotification({
              title: "Lunex",
              body: `New message from ${conv.username}`,
            });
          }
        }
        
        // Update Ref state
        prevUnreadMap.current[conv.conversationId] = conv.unreadCount;
      }

      // ── PROCESS NEW FRIEND REQUESTS (Bypass Logic) ──
      const currentReqCount = pendingRequests.length;
      if (currentReqCount > prevReqCount.current) {
        // Sirf "nobody" par block hogi, baqi sab par request notification aayegi
        if (privacy !== "nobody") {
          sendNotification({
            title: "Lunex",
            body: "You have a new friend request!",
          });
        }
      }
      prevReqCount.current = currentReqCount;

      // ── UPDATE TASKBAR BADGE ──
      updateAppBadge(conversations, currentReqCount);
    };

    handleNotifications();
  }, [conversations, pendingRequests, userSettings]);

  // Badge Update Helper Function
  function updateAppBadge(convs: any[], reqCount: number) {
    const totalUnread = convs.reduce((acc, curr) => acc + (curr?.unreadCount || 0), 0); // ── FIX: Optional chaining ──
    const totalBadgeCount = totalUnread + reqCount;
    
    // Cross-platform Web/PWA/Tauri Badge API
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