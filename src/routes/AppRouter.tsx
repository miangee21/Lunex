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
import { getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { AlertTriangle, DownloadCloud } from "lucide-react";
import { toast } from "sonner";

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

  const minRequiredVersion = useQuery(api.users.getMinRequiredVersion);
  const [isOutdated, setIsOutdated] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function checkVersion() {
      if (!minRequiredVersion) return;
      try {
        const currentVersion = await getVersion();
        const cParts = currentVersion.split(".").map(Number);
        const rParts = minRequiredVersion.split(".").map(Number);
        let outdated = false;

        for (let i = 0; i < 3; i++) {
          if (cParts[i] < rParts[i]) {
            outdated = true;
            break;
          }
          if (cParts[i] > rParts[i]) {
            break;
          }
        }

        setIsOutdated(outdated);
      } catch (err) {
        console.error("Failed to check local version:", err);
      }
    }
    checkVersion();
  }, [minRequiredVersion]);

  async function handleForceUpdate() {
    if (isUpdating) return;
    setIsUpdating(true);
    const toastId = toast.loading("Downloading critical update...");

    try {
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        toast.success("Update installed! Restarting...", { id: toastId });
        setTimeout(relaunch, 1500);
      } else {
        toast.error("Update not found on server yet.", { id: toastId });
        setIsUpdating(false);
      }
    } catch (err) {
      toast.error("Failed to download update.", { id: toastId });
      setIsUpdating(false);
    }
  }

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash) return <SplashPage onComplete={handleSplashComplete} />;

  if (isOutdated) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-destructive/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-background/50 backdrop-blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-sm p-8 text-center bg-background/40 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl mx-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6 shadow-sm">
            <AlertTriangle className="text-destructive" size={32} />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Update Required
          </h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            You are currently using an older version of Lunex.
            <br /> A critical update is required to continue using <br />
            the app securely.
          </p>
          <button
            onClick={handleForceUpdate}
            disabled={isUpdating}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isUpdating ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>
                <DownloadCloud size={18} />
                Update Now
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (isAppLockEnabled && isLocked) return <PinLockScreen />;

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
