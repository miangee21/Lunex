//src/routes/AppRouter.tsx
import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useChatStore } from "@/store/chatStore";
import { useAppLockStore } from "@/store/appLockStore";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import ChatPage from "@/pages/ChatPage";
import SplashPage from "@/pages/SplashPage";
import PinLockScreen from "@/components/auth/PinLockScreen";
import { load } from "@tauri-apps/plugin-store";

export default function AppRouter() {
  const [showSplash, setShowSplash] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.userId);

  const isLocked = useAppLockStore((s) => s.isLocked);
  const isAppLockEnabled = useAppLockStore((s) => s.isAppLockEnabled);
  const autoLockTimer = useAppLockStore((s) => s.autoLockTimer);
  const setLocked = useAppLockStore((s) => s.setLocked);

  useEffect(() => {
    async function checkLock() {
      try {
        const store = await load("lunex-applock.json");
        const lockData = await store.get("lockData");
        if (lockData) {
          useAppLockStore.getState().setAppLockEnabled(true);
          useAppLockStore.getState().setLocked(true);
        }
      } catch (err) {
        console.error("Startup lock check failed:", err);
      }
    }
    checkLock();
  }, []);

  useEffect(() => {
    if (!isAppLockEnabled || !isAuthenticated) return;
    const timerMs = {
      "1min": 60000,
      "5min": 300000,
      "30min": 1800000,
      "1hr": 3600000,
    };
    const delay = timerMs[autoLockTimer];
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setLocked(true), delay);
    };

    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("click", reset);
    window.addEventListener("touchstart", reset);
    reset();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("click", reset);
      window.removeEventListener("touchstart", reset);
    };
  }, [isAppLockEnabled, isAuthenticated, autoLockTimer, setLocked]);

  const userRecord = useQuery(
    api.users.getUserById,
    userId
      ? { userId: userId as Id<"users">, viewerId: userId as Id<"users"> }
      : "skip",
  );

  const syncFromCloud = useThemeStore((s) => s.syncFromCloud);
  const applyThemeToHTML = useThemeStore((s) => s.applyThemeToHTML);

  const clearActiveChat = useChatStore((s) => s.clearActiveChat);
  const setSidebarView = useChatStore((s) => s.setSidebarView);

  useEffect(() => {
    if (!userId) {
      applyThemeToHTML(null);

      clearActiveChat();
      setSidebarView("chats");

      return;
    }

    if (userRecord) {
      const cloudTheme = userRecord.theme || "dark";
      const cloudPreset = userRecord.globalPreset || "default";

      syncFromCloud(userId, cloudTheme, cloudPreset);
    }

    applyThemeToHTML(userId);
  }, [
    userId,
    userRecord,
    syncFromCloud,
    applyThemeToHTML,
    clearActiveChat,
    setSidebarView,
  ]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (isAppLockEnabled && isLocked) return <PinLockScreen />;

  if (showSplash) return <SplashPage onComplete={handleSplashComplete} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/chat" />}
        />
        <Route
          path="/signup"
          element={!isAuthenticated ? <SignupPage /> : <Navigate to="/chat" />}
        />
        <Route
          path="/chat"
          element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
