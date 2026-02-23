import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import ChatPage from "@/pages/ChatPage";
import SplashPage from "@/pages/SplashPage";

export default function AppRouter() {
  const [showSplash, setShowSplash] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashPage />;

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