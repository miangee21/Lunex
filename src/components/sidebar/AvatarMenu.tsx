//src/components/sidebar/AvatarMenu.tsx
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useAppLockStore } from "@/store/appLockStore";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { User, LogOut } from "lucide-react";
import { useEffect, useRef } from "react";
import { load } from "@tauri-apps/plugin-store";
import { toast } from "sonner";

interface AvatarMenuProps {
  onClose: () => void;
}

export default function AvatarMenu({ onClose }: AvatarMenuProps) {
  const navigate = useNavigate();
  const { setSidebarView } = useChatStore();
  const { logout, userId } = useAuthStore();
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  async function handleLogout() {
    try {
      if (userId) {
        const typedUserId = userId as Id<"users">;
        await setOnlineStatus({ userId: typedUserId, isOnline: false });
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error("Failed to set offline status:", error);
    } finally {
      try {
        const store = await load("lunex-applock.json");
        await store.clear();
        await store.save();
      } catch (err) {
        console.error("Failed to clear store on logout:", err);
      }
      useAppLockStore.getState().setAppLockEnabled(false);
      useAppLockStore.getState().setLocked(false);
      logout();
      toast.success("Logged out successfully!");
      navigate("/login");
      onClose();
    }
  }

  function handleMyProfile() {
    setSidebarView("profile");
    onClose();
  }

  return (
    <div
      ref={menuRef}
      className="absolute bottom-12 left-1 w-44 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50"
    >
      <button
        onClick={handleMyProfile}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <User size={16} className="text-muted-foreground" />
        My Profile
      </button>

      <div className="h-px bg-border mx-2" />

      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}
