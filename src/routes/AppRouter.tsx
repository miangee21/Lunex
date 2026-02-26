import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useChatStore } from "@/store/chatStore"; // ── NEW: Imported Chat Store
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import ChatPage from "@/pages/ChatPage";
import SplashPage from "@/pages/SplashPage";

export default function AppRouter() {
  const [showSplash, setShowSplash] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.userId);

  const userRecord = useQuery(
    api.users.getUserById,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const syncFromCloud = useThemeStore((s) => s.syncFromCloud);
  const applyThemeToHTML = useThemeStore((s) => s.applyThemeToHTML);
  
  // ── NEW: Get chat store reset functions ──
  const clearActiveChat = useChatStore((s) => s.clearActiveChat);
  const setSidebarView = useChatStore((s) => s.setSidebarView);

  useEffect(() => {
    // 1. If logged out, apply the default/device theme and RESET chat state
    if (!userId) {
      applyThemeToHTML(null);
      
      // ── NEW: Clean up the UI state for the next login ──
      clearActiveChat();         // Closes any open chat and profile panel
      setSidebarView("chats");   // Resets sidebar back to the 'chats' tab
      
      return;
    }

    // 2. If the user is logged in and we received their cloud data, sync it locally
    if (userRecord) {
      const cloudTheme = userRecord.theme || "dark";
      const cloudPreset = userRecord.globalPreset || "default";
      
      syncFromCloud(userId, cloudTheme, cloudPreset);
    }

    // 3. Apply the theme to the HTML tag 
    applyThemeToHTML(userId);
    
  }, [userId, userRecord, syncFromCloud, applyThemeToHTML, clearActiveChat, setSidebarView]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash) return <SplashPage onComplete={handleSplashComplete} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/login" />} />
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/chat" />} />
        <Route path="/signup" element={!isAuthenticated ? <SignupPage /> : <Navigate to="/chat" />} />
        <Route path="/chat" element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}