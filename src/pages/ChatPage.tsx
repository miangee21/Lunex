import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
      <p className="text-foreground text-2xl font-semibold">Hey this is Chat Page</p>
      <p className="text-muted-foreground text-sm">Welcome, {username}!</p>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground"
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <Button variant="destructive" onClick={logout}>
        Logout
      </Button>
    </div>
  );
}