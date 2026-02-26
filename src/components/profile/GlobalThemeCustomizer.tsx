import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "convex/react"; // ── NEW: Added Convex mutation
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface GlobalThemeCustomizerProps {
  onBack: () => void;
}

const GLOBAL_PRESETS = [
  { id: "default", name: "Default (Ocean)", color: "#3b82f6" },
  { id: "sapphire", name: "Sapphire", color: "#4f46e5" },
  { id: "emerald", name: "Emerald", color: "#10b981" },
  { id: "amethyst", name: "Amethyst", color: "#8b5cf6" },
  { id: "crimson", name: "Crimson", color: "#e11d48" },
  { id: "sunset", name: "Sunset", color: "#f97316" },
  { id: "midnight", name: "Midnight Abyss", color: "#000000" }, 
  { id: "monochrome", name: "Monochrome", color: "#737373" },
];

export default function GlobalThemeCustomizer({ onBack }: GlobalThemeCustomizerProps) {
  const { userConfigs, setGlobalPreset } = useThemeStore();
  const userId = useAuthStore((s) => s.userId);

  // ── NEW: Convex Mutation for syncing global preset to the cloud ──
  const updateThemeSettings = useMutation(api.users.updateThemeSettings);

  const currentPreset = userId && userConfigs[userId] ? userConfigs[userId].globalPreset : "default";

  // ── NEW: Handler for updating local state AND cloud DB ──
  const handlePresetSelect = async (presetId: string) => {
    if (!userId) return;

    // 1. Instant UI Update (Zero Lag)
    setGlobalPreset(userId, presetId);

    // 2. Background Cloud Sync
    try {
      await updateThemeSettings({
        userId: userId as Id<"users">,
        globalPreset: presetId,
      });
    } catch (error) {
      console.error("Failed to sync global preset to cloud:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-sm flex-1">Global Theme</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        
        <h2 className="text-muted-foreground font-bold text-sm px-1 leading-relaxed">
          Choose a global theme for Lunex.
        </h2>

        {/* ── THEMES GRID ── */}
        <div>
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Premium Presets
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {GLOBAL_PRESETS.map((preset) => {
              const isActive = currentPreset === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)} // ── FIXED: Call the new handler
                  className={`relative flex flex-col items-start gap-3 p-3.5 rounded-2xl transition-all border text-left overflow-hidden ${
                    isActive 
                      ? "bg-primary/10 border-primary shadow-sm" 
                      : "bg-accent border-transparent hover:bg-accent/70"
                  }`}
                >
                  {/* Active Checkmark */}
                  {isActive && (
                    <div className="absolute top-3 right-3 text-primary animate-in zoom-in">
                      <CheckCircle2 size={16} strokeWidth={3} />
                    </div>
                  )}

                  {/* Color Preview Bubble */}
                  <div 
                    className="w-10 h-10 rounded-full shadow-inner border-2 border-white/20 dark:border-white/10"
                    style={{ 
                      backgroundColor: preset.color,
                      ...(preset.id === "midnight" && { border: "2px solid #333" })
                    }} 
                  />
                  
                  {/* Preset Name */}
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                      {preset.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}