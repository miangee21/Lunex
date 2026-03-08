// src/components/sidebar/DotsMenu.tsx
import { useState, useRef, useEffect } from "react";
import { MoreVertical, Settings, Star, CheckSquare, RefreshCw, Info } from "lucide-react";
import { useChatStore } from "@/store/chatStore"; // ── STEP 16: Import Store ──

interface DotsMenuProps {
  onSettingsClick: () => void;
}

export default function DotsMenu({ onSettingsClick }: DotsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  // ── STEP 16: Extract actions from store ──
  const { setSidebarView, setIsSelectionMode } = useChatStore();

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
      active: true, // ── STEP 16: Enabled Select Chats ──
    },
    {
      icon: Star,
      label: "Starred Messages",
      onClick: () => {
        setSidebarView("starred"); // ── FIX: Open Starred Messages Panel ──
        setOpen(false);
      },
      active: true, // ── FIX: Enabled Starred Messages ──
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
      label: "Check Updates",
      onClick: () => setOpen(false),
      active: false,
    },
    {
      icon: Info,
      label: "About",
      onClick: () => {
        setSidebarView("about");
        setOpen(false);
      },
      active: true, // ── STEP 16: Enabled About Panel ──
    },
  ];

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 outline-none
          ${open
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        title="Menu"
      >
        <MoreVertical size={18} />
      </button>

      {/* ── Sleek Minimalist Dropdown ── */}
      {open && (
        <div className="absolute right-0 top-10 w-48 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="bg-card/95 backdrop-blur-md border border-border/40 rounded-xl shadow-lg overflow-hidden py-1.5 flex flex-col">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isSettings = item.label === "Settings";

              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    onClick={item.onClick}
                    disabled={!item.active}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-[14px] transition-colors mx-1 rounded-md w-[calc(100%-8px)]
                      ${item.active
                        ? "text-foreground hover:bg-accent/50 cursor-pointer"
                        : "text-muted-foreground/40 cursor-not-allowed opacity-70"
                      }`}
                  >
                    <Icon size={16} strokeWidth={2} className={item.active ? "text-muted-foreground" : "text-muted-foreground/40"} />
                    <span className="font-medium whitespace-nowrap truncate tracking-wide">{item.label}</span>
                  </button>

                  {/* ── Divider strictly after Settings ── */}
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