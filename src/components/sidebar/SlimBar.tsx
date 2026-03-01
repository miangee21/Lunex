//src/components/sidebar/SlimBar.tsx
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AvatarMenu from "@/components/sidebar/AvatarMenu";
import { MessageSquare, Users, Sun, Moon } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import UserAvatar from "@/components/shared/UserAvatar";
import LunexLogo from "@/components/shared/LunexLogo";
import { useState } from "react";

export default function SlimBar() {
  const { sidebarOpen, toggleSidebar, setSidebarView, sidebarView } =
    useChatStore();

  const { userConfigs, toggleTheme } = useThemeStore();
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const currentTheme =
    userId && userConfigs[userId] ? userConfigs[userId].theme : "dark";

  const updateThemeSettings = useMutation(api.users.updateThemeSettings);

  const requestsCount = useQuery(
    api.friends.getIncomingRequestsCount,
    userId ? { userId } : "skip",
  );

  const userRecord = useQuery(
    api.users.getUserById,
    userId ? { userId } : "skip",
  );

  const handleThemeToggle = async () => {
    if (userId) {
      toggleTheme(userId);

      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      try {
        await updateThemeSettings({
          userId: userId as Id<"users">,
          theme: nextTheme,
        });
      } catch (error) {
        console.error("Failed to sync theme to cloud:", error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center h-screen w-14 shrink-0 bg-sidebar border-r border-border py-3 gap-2 z-20">
      <button
        onClick={toggleSidebar}
        className="w-9 h-9 rounded-xl overflow-hidden mb-2 hover:opacity-80 transition-opacity shrink-0"
        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <LunexLogo />
      </button>

      <button
        onClick={() => setSidebarView("chats")}
        title="Chats"
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          sidebarView === "chats" || sidebarView === "search"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <MessageSquare size={20} />
      </button>

      <button
        onClick={() => setSidebarView("requests")}
        title="Requests"
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
          sidebarView === "requests"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <Users size={20} />

        {requestsCount !== undefined && requestsCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {requestsCount > 99 ? "99+" : requestsCount}
          </span>
        )}
      </button>

      <div className="flex-1" />

      <button
        onClick={handleThemeToggle}
        title="Toggle theme"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {currentTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <button
        onClick={() => setAvatarMenuOpen((v) => !v)}
        title={username ?? "Profile"}
        className="w-10 h-10 rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
      >
        <UserAvatar
          username={username ?? "?"}
          profilePicStorageId={
            userRecord?.profilePicStorageId as Id<"_storage"> | null
          }
          size="md"
        />
      </button>

      {avatarMenuOpen && (
        <AvatarMenu onClose={() => setAvatarMenuOpen(false)} />
      )}
    </div>
  );
}
