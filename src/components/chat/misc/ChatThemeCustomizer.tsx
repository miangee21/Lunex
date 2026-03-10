//src/components/chat/misc/ChatThemeCustomizer.tsx
import { useChatStore } from "@/store/chatStore";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface ChatThemeCustomizerProps {
  onBack: () => void;
}

const THEME_PRESETS = [
  {
    id: undefined,
    name: "Default",
    bg: undefined,
    my: undefined,
    other: undefined,
  },
  {
    id: "ocean",
    name: "Ocean",
    bg: "#e0f2fe",
    my: "#0284c7",
    other: "#bae6fd",
  },
  {
    id: "forest",
    name: "Forest",
    bg: "#dcfce7",
    my: "#16a34a",
    other: "#bbf7d0",
  },
  {
    id: "signal",
    name: "Signal",
    bg: "#121212",
    my: "#2c6bed",
    other: "#2a2a2a",
  },
  {
    id: "telegram",
    name: "Telegram",
    bg: "#92bcdc",
    my: "#eefdd6",
    other: "#ffffff",
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: "#1e1e2e",
    my: "#89b4fa",
    other: "#313244",
  },
];

export default function ChatThemeCustomizer({
  onBack,
}: ChatThemeCustomizerProps) {
  const { activeChat, updateActiveChatTheme } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const setChatThemeCloud = useMutation(api.chatThemes.setChatTheme);

  if (!activeChat) return null;

  const handleThemeUpdate = async (
    updates: Parameters<typeof updateActiveChatTheme>[0],
  ) => {
    if (!userId || !activeChat.userId) return;

    updateActiveChatTheme(updates);

    const newThemeState = {
      chatPresetName: activeChat.chatPresetName,
      chatBgColor: activeChat.chatBgColor,
      myBubbleColor: activeChat.myBubbleColor,
      otherBubbleColor: activeChat.otherBubbleColor,
      myTextColor: activeChat.myTextColor,
      otherTextColor: activeChat.otherTextColor,
      ...updates,
    };

    try {
      await setChatThemeCloud({
        userId: userId as Id<"users">,
        otherUserId: activeChat.userId as Id<"users">,
        ...newThemeState,
      });
    } catch (error) {
      console.error("Failed to sync chat theme to cloud:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-sm flex-1">Chat Theme</h2>
        <button
          onClick={() =>
            handleThemeUpdate({
              chatPresetName: undefined,
              chatBgColor: undefined,
              myBubbleColor: undefined,
              otherBubbleColor: undefined,
              myTextColor: undefined,
              otherTextColor: undefined,
            })
          }
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="Reset to default"
        >
          <RefreshCcw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div>
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Templates
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESETS.map((preset) => {
              const isActive =
                activeChat.chatPresetName === preset.id ||
                (!activeChat.chatPresetName && !preset.id);

              return (
                <button
                  key={preset.name}
                  onClick={() =>
                    handleThemeUpdate({
                      chatPresetName: preset.id,
                      chatBgColor: undefined,
                      myBubbleColor: undefined,
                      otherBubbleColor: undefined,
                      myTextColor: undefined,
                      otherTextColor: undefined,
                    })
                  }
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${
                    isActive
                      ? "bg-primary/10 border-primary"
                      : "bg-accent border-transparent hover:bg-accent/70"
                  }`}
                >
                  <div
                    className={`w-full h-10 rounded-xl flex items-center justify-between px-2 ${!preset.bg && "bg-background border border-border"}`}
                    style={{ backgroundColor: preset.bg }}
                  >
                    <div
                      className={`w-5 h-5 rounded-full ${!preset.other && "bg-secondary"}`}
                      style={{ backgroundColor: preset.other }}
                    />
                    <div
                      className={`w-5 h-5 rounded-full ${!preset.my && "bg-primary"}`}
                      style={{ backgroundColor: preset.my }}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold ${isActive ? "text-primary" : "text-foreground"}`}
                  >
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border mx-1" />

        <div>
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Custom Colors
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent">
              <span className="text-sm font-semibold text-foreground">
                Background
              </span>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border shadow-sm">
                <input
                  type="color"
                  value={activeChat.chatBgColor || "#ffffff"}
                  onChange={(e) =>
                    handleThemeUpdate({ chatBgColor: e.target.value })
                  }
                  className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent">
              <span className="text-sm font-semibold text-foreground">
                My Bubble
              </span>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border shadow-sm">
                <input
                  type="color"
                  value={activeChat.myBubbleColor || "#3b82f6"}
                  onChange={(e) =>
                    handleThemeUpdate({ myBubbleColor: e.target.value })
                  }
                  className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent">
              <span className="text-sm font-semibold text-foreground">
                My Text
              </span>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border shadow-sm">
                <input
                  type="color"
                  value={activeChat.myTextColor || "#ffffff"}
                  onChange={(e) =>
                    handleThemeUpdate({ myTextColor: e.target.value })
                  }
                  className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent">
              <span className="text-sm font-semibold text-foreground">
                Their Bubble
              </span>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border shadow-sm">
                <input
                  type="color"
                  value={activeChat.otherBubbleColor || "#e5e7eb"}
                  onChange={(e) =>
                    handleThemeUpdate({ otherBubbleColor: e.target.value })
                  }
                  className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent">
              <span className="text-sm font-semibold text-foreground">
                Their Text
              </span>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border shadow-sm">
                <input
                  type="color"
                  value={activeChat.otherTextColor || "#000000"}
                  onChange={(e) =>
                    handleThemeUpdate({ otherTextColor: e.target.value })
                  }
                  className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
