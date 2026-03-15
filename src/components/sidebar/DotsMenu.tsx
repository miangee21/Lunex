// src/components/sidebar/DotsMenu.tsx
import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";
import {
  MoreVertical,
  Settings,
  Star,
  CheckSquare,
  RefreshCw,
  Info,
} from "lucide-react";

interface DotsMenuProps {
  onSettingsClick: () => void;
}

export default function DotsMenu({ onSettingsClick }: DotsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { setSidebarView, setIsSelectionMode } = useChatStore();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  async function handleCheckUpdate() {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    const toastId = toast.loading("Checking for updates...");

    try {
      const update = await check();

      if (update) {
        toast.loading(`Downloading update v${update.version}...`, {
          id: toastId,
        });
        await update.downloadAndInstall();
        toast.success("Update installed! Restarting app...", { id: toastId });
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await relaunch();
      } else {
        toast.success("You are on the latest version!", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to check for updates.", { id: toastId });
    } finally {
      setIsCheckingUpdate(false);
      setOpen(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const menuItems = [
    {
      icon: CheckSquare,
      label: "Select Chats",
      onClick: () => {
        setIsSelectionMode(true);
        setOpen(false);
      },
      active: true,
    },
    {
      icon: Star,
      label: "Starred Messages",
      onClick: () => {
        setSidebarView("starred");
        setOpen(false);
      },
      active: true,
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: () => {
        onSettingsClick();
        setOpen(false);
      },
      active: true,
    },
    {
      icon: RefreshCw,
      label: isCheckingUpdate ? "Checking..." : "Check Updates",
      onClick: handleCheckUpdate,
      active: !isCheckingUpdate,
    },
    {
      icon: Info,
      label: "About",
      onClick: () => {
        setSidebarView("about");
        setOpen(false);
      },
      active: true,
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 outline-none
          ${
            open
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        title="Menu"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-48 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="bg-card/95 backdrop-blur-md border border-border/40 rounded-xl shadow-lg overflow-hidden py-1.5 flex flex-col">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSettings = item.label === "Settings";

              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    onClick={item.onClick}
                    disabled={!item.active}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-[14px] transition-colors mx-1 rounded-md
                      ${
                        item.active
                          ? "text-foreground hover:bg-accent/50 cursor-pointer"
                          : "text-muted-foreground/40 cursor-not-allowed opacity-70"
                      }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={2}
                      className={
                        item.active
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                      }
                    />
                    <span className="font-medium whitespace-nowrap truncate tracking-wide">
                      {item.label}
                    </span>
                  </button>

                  {isSettings && (
                    <div className="h-px bg-border/40 mx-2 my-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
