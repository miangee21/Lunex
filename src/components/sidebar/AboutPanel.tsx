// src/components/sidebar/AboutPanel.tsx
import { ArrowLeft, Github, MessageCircle, Heart, Globe } from "lucide-react";
import LunexLogo from "@/components/shared/LunexLogo";
import { open } from "@tauri-apps/plugin-shell";
import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

interface AboutPanelProps {
  onBack: () => void;
}

export default function AboutPanel({ onBack }: AboutPanelProps) {
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          const version = await getVersion();
          setAppVersion(version);
        } else {
          setAppVersion("Web View");
        }
      } catch (error) {
        console.error("Failed to fetch version:", error);
      }
    };
    fetchVersion();
  }, []);

  const handleOpenLink = async (url: string) => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        await open(url);
      } else {
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar animate-in slide-in-from-left-4 duration-200">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40 shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-semibold text-[15px]">About</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar flex flex-col">
        <div className="flex flex-col items-center justify-center mb-10 mt-4">
          <div className="w-24 h-24 mb-3 rounded-full overflow-hidden drop-shadow-xl ring-1 ring-border/50 flex items-center justify-center">
            <LunexLogo className="w-full h-full scale-[1.10]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Lunex
          </h1>
          <p className="text-[13px] text-muted-foreground font-medium mt-1 bg-accent/50 px-3 py-1 rounded-full">
            Version {appVersion || "..."}
          </p>
        </div>

        <div className="text-center px-2 mb-10">
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            A secure, fast, and beautifully minimalist desktop messenger.
            Designed to keep your conversations private and your focus sharp.
          </p>
        </div>

        <div className="mb-auto">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
            Community & Support
          </p>
          <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
            {/* GitHub Link */}
            <button
              onClick={() =>
                handleOpenLink("https://github.com/miangee21/Lunex")
              }
              className="w-full flex items-center justify-between px-4 py-3.5 bg-transparent hover:bg-accent/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground/5 text-foreground group-hover:bg-foreground/10 transition-colors">
                  <Github size={16} />
                </div>
                <span className="text-[14px] font-medium text-foreground">
                  GitHub Repository
                </span>
              </div>
            </button>

            <div className="h-px bg-border/40 ml-14" />

            {/* Discord Link */}
            <button
              onClick={() => handleOpenLink("https://discord.gg/Av8CPpQXkB")}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-transparent hover:bg-accent/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#5865F2]/10 text-[#5865F2] group-hover:bg-[#5865F2]/20 transition-colors">
                  <MessageCircle size={16} />
                </div>
                <span className="text-[14px] font-medium text-foreground">
                  Discord Community
                </span>
              </div>
            </button>

            <div className="h-px bg-border/40 ml-14" />

            {/* Website Link */}
            <button
              onClick={() => handleOpenLink("https://lunex-app.vercel.app")}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-transparent hover:bg-accent/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                  <Globe size={16} />
                </div>
                <span className="text-[14px] font-medium text-foreground">
                  Official Website
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center pb-2 opacity-80 hover:opacity-100 transition-opacity">
          <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
            Made with{" "}
            <Heart
              size={14}
              className="text-red-500 fill-red-500 animate-pulse"
            />{" "}
            by{" "}
            <span className="text-[14px] font-semibold text-foreground tracking-wide ml-0.5">
              Hassan
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
