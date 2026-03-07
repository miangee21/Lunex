// src/components/sidebar/SettingsPanel.tsx
import { useState } from "react";
import { ArrowLeft, Wifi, Keyboard, CheckCheck, Timer, ChevronRight, Bell } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import PrivacySelectorModal from "./PrivacySelectorModal"; // Yeh file hum next step mein banayenge!

const TIMER_LABELS: Record<string, string> = {
  off: "Off",
  "1h": "1 Hour",
  "6h": "6 Hours",
  "12h": "12 Hours",
  "1d": "1 Day",
  "3d": "3 Days",
  "7d": "7 Days",
};

const PRIVACY_LABELS: Record<string, string> = {
  everyone: "Everyone",
  nobody: "Nobody",
  only_these: "Only these contacts",
  all_except: "All except...",
};

const TIMER_OPTIONS = ["off", "1h", "6h", "12h", "1d", "3d", "7d"] as const;

interface SettingsPanelProps {
  onBack: () => void;
}

export type PrivacyField = "privacyOnline" | "privacyTyping" | "privacyReadReceipts";

export default function SettingsPanel({ onBack }: SettingsPanelProps) {
  const userId = useAuthStore((s) => s.userId);
  const updateGlobalDisappearingSetting = useMutation(api.users.updateGlobalDisappearingSetting);

  const userSettings = useQuery(
    api.presence.getUserSettings,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [savingTimer, setSavingTimer] = useState(false);
  
  // Modal State
  const [activePrivacyField, setActivePrivacyField] = useState<PrivacyField | null>(null);

  async function handleDisappearingChange(value: string) {
    if (!userId) return;

    setShowTimerPicker(false);
    setSavingTimer(true);
    try {
      await updateGlobalDisappearingSetting({
        userId: userId as Id<"users">,
        timer: value === "off" ? undefined : (value as any),
      });
      toast.success(`Default timer set to ${TIMER_LABELS[value]}`);
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setSavingTimer(false);
    }
  }

  const isLoading = userSettings === undefined;

  // Agar userSettings load nahi hue tou default "everyone" dikhayenge temporarily
  const privacySettingsList = [
    {
      id: "privacyOnline" as PrivacyField,
      icon: Wifi,
      label: "Online Status",
      currentValue: userSettings?.privacyOnline ?? "everyone",
    },
    {
      id: "privacyTyping" as PrivacyField,
      icon: Keyboard,
      label: "Typing Indicator",
      currentValue: userSettings?.privacyTyping ?? "everyone",
    },
    {
      id: "privacyReadReceipts" as PrivacyField,
      icon: CheckCheck,
      label: "Read Receipts",
      currentValue: userSettings?.privacyReadReceipts ?? "everyone",
    },
  ];

  const currentDisappearing = userSettings?.settingDisappearing ?? "off";

  return (
    <>
      <div className="flex flex-col h-full bg-background/95 backdrop-blur-md animate-in slide-in-from-left-4 duration-200">
        
        {/* ── Minimalist Header ── */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40 shrink-0">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-foreground font-semibold text-[15px]">Settings</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-5 h-5 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* ── Privacy Section (New Minimalist Look) ── */}
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
                  Privacy
                </p>
                <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
                  {privacySettingsList.map((setting, index) => {
                    const Icon = setting.icon;
                    const isLast = index === privacySettingsList.length - 1;

                    return (
                      <div key={setting.id}>
                        <button
                          onClick={() => setActivePrivacyField(setting.id)}
                          className="w-full flex items-center justify-between px-3 py-3 bg-transparent hover:bg-accent/20 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
                              <Icon size={15} />
                            </div>
                            <span className="text-[14px] font-medium text-foreground">
                              {setting.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-muted-foreground font-medium truncate max-w-[120px]">
                              {PRIVACY_LABELS[setting.currentValue]}
                            </span>
                            <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                          </div>
                        </button>
                        {!isLast && <div className="h-[1px] bg-border/40 ml-12" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Security Section (Dropdown Style) ── */}
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
                  Security
                </p>
                <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
                  <div
                    className="flex items-center justify-between px-3 py-3 bg-transparent hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => !savingTimer && setShowTimerPicker((v) => !v)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-md ${currentDisappearing !== "off" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Timer size={15} />
                      </div>
                      <span className="text-[14px] font-medium text-foreground">
                        Message Timer
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {savingTimer ? (
                        <div className="w-4 h-4 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <span className="text-[12px] text-muted-foreground font-medium">
                            {TIMER_LABELS[currentDisappearing]}
                          </span>
                          <ChevronRight
                            size={16}
                            className={`text-muted-foreground transition-transform duration-200 ${showTimerPicker ? "rotate-90" : ""}`}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Sleek Dropdown ── */}
                  <div className={`grid transition-all duration-200 ease-in-out ${showTimerPicker ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden bg-accent/5">
                      <div className="h-[1px] bg-border/40 ml-12" />
                      {TIMER_OPTIONS.map((option) => {
                        const isSelected = currentDisappearing === option;
                        return (
                          <button
                            key={option}
                            onClick={() => handleDisappearingChange(option)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent/30 transition-colors"
                          >
                            <span className={`text-[13px] ml-10 ${isSelected ? "text-primary font-medium" : "text-foreground"}`}>
                              {TIMER_LABELS[option]}
                            </span>
                            {isSelected && <CheckCheck size={14} className="text-primary mr-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Notifications (Grayed Out) ── */}
              <div className="opacity-50 pointer-events-none pb-6">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
                  App
                </p>
                <div className="bg-card/30 border border-border/30 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground">
                        <Bell size={15} />
                      </div>
                      <span className="text-[14px] font-medium text-foreground">
                        Notifications
                      </span>
                    </div>
                    {/* Dummy Disabled Toggle */}
                    <div className="relative w-9 h-5 rounded-full bg-muted-foreground/30 opacity-50">
                      <div className="absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── Render Modal Conditionally ── */}
      {activePrivacyField && userSettings && (
        <PrivacySelectorModal
          isOpen={!!activePrivacyField}
          onClose={() => setActivePrivacyField(null)}
          field={activePrivacyField}
          currentValue={
            activePrivacyField === "privacyOnline" ? userSettings.privacyOnline :
            activePrivacyField === "privacyTyping" ? userSettings.privacyTyping :
            userSettings.privacyReadReceipts
          }
          currentExceptions={
            activePrivacyField === "privacyOnline" ? userSettings.onlineExceptions :
            activePrivacyField === "privacyTyping" ? userSettings.typingExceptions :
            userSettings.readReceiptsExceptions
          }
        />
      )}
    </>
  );
}