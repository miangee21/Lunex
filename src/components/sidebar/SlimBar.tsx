import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import AvatarMenu from "@/components/sidebar/AvatarMenu";
import { MessageSquare, Users, Sun, Moon } from "lucide-react";
import icon from "@/assets/icon.png";
import { useState } from "react";

export default function SlimBar() {
  const { sidebarOpen, toggleSidebar, setSidebarView, sidebarView } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();
  const username = useAuthStore((s) => s.username);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

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
          sidebarView === "chats"
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
        {/* Dummy badge — will be dynamic in Step 9 */}
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
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
      <div className="relative">
        <button
          onClick={() => setAvatarMenuOpen((v) => !v)}
          title={username ?? "Profile"}
          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
        >
          {username?.[0]?.toUpperCase() ?? "?"}
        </button>

        {avatarMenuOpen && (
          <AvatarMenu onClose={() => setAvatarMenuOpen(false)} />
        )}
      </div>

    </div>
  );
}