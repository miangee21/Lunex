import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AvatarMenu from "@/components/sidebar/AvatarMenu";
import { MessageSquare, Users, Sun, Moon } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import UserAvatar from "@/components/shared/UserAvatar";
import icon from "@/assets/icon.png";
import { useState } from "react";

export default function SlimBar() {
  const { sidebarOpen, toggleSidebar, setSidebarView, sidebarView } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Real-time requests badge
  const requestsCount = useQuery(
    api.friends.getIncomingRequestsCount,
    userId ? { userId } : "skip"
  );

  const userRecord = useQuery(
  api.users.getUserById,
  userId ? { userId } : "skip"
);

  return (
    <div className="flex flex-col items-center h-screen w-14 flex-shrink-0 bg-sidebar border-r border-border py-3 gap-2 z-20">

      {/* Logo — toggles sidebar */}
      <button
        onClick={toggleSidebar}
        className="w-9 h-9 rounded-xl overflow-hidden mb-2 hover:opacity-80 transition-opacity flex-shrink-0"
        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <img src={icon} alt="Lunex" className="w-full h-full object-cover" />
      </button>

      {/* Chats button */}
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

      {/* Requests button */}
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
        {/* Real-time badge */}
        {requestsCount !== undefined && requestsCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {requestsCount > 99 ? "99+" : requestsCount}
          </span>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title="Toggle theme"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Avatar — opens menu */}
      <button
        onClick={() => setAvatarMenuOpen((v) => !v)}
        title={username ?? "Profile"}
        className="w-10 h-10 rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
     >
       <UserAvatar
         username={username ?? "?"}
         profilePicStorageId={userRecord?.profilePicStorageId as Id<"_storage"> | null}
         size="md"
        />
       </button>

        {avatarMenuOpen && (
          <AvatarMenu onClose={() => setAvatarMenuOpen(false)} />
        )}
      </div>
  );
}