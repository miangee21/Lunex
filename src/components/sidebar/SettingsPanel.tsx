// src/components/sidebar/SettingsPanel.tsx
import { useState, useEffect } from "react";
import { ArrowLeft, Wifi, Keyboard, CheckCheck, Timer, ChevronRight, Bell } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

const TIMER_LABELS: Record<string, string> = {
  off: "Off",
  "1h": "1 Hour",
  "6h": "6 Hours",
  "12h": "12 Hours",
  "1d": "1 Day",
  "3d": "3 Days",
  "7d": "7 Days",
};

const TIMER_OPTIONS = ["off", "1h", "6h", "12h", "1d", "3d", "7d"] as const;

interface SettingsPanelProps {
  onBack: () => void;
}

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

// ── Minimalist Sleek Toggle ──
function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ease-in-out shrink-0 outline-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <div className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-sm
        transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

export default function SettingsPanel({ onBack }: SettingsPanelProps) {
  const userId = useAuthStore((s) => s.userId);
  const updatePrivacySettings = useMutation(api.presence.updatePrivacySettings);

  const userSettings = useQuery(
    api.presence.getUserSettings,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const [onlineStatus, setOnlineStatus] = useState(true);
  const [typing, setTyping] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [disappearing, setDisappearing] = useState<string>("off");

  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (userSettings) {
      setOnlineStatus(userSettings.settingOnlineStatus ?? true);
      setTyping(userSettings.settingTyping ?? true);
      setReadReceipts(userSettings.settingReadReceipts ?? true);
      setDisappearing(userSettings.settingDisappearing ?? "off");
    }
  }, [userSettings]);

  async function handleToggle(
    field: "settingOnlineStatus" | "settingTyping" | "settingReadReceipts",
    value: boolean,
    setter: (v: boolean) => void,
    label: string,
  ) {
    if (!userId) return;

    setter(value);
    setSaving(field);
    try {
      await updatePrivacySettings({
        userId: userId as Id<"users">,
        [field]: value,
      });
      // Optional: Remove toast for even cleaner minimalist feel, or keep it for feedback
      toast.success(`${label} ${value ? "enabled" : "disabled"}`);
    } catch {
      setter(!value);
      toast.error("Failed to update setting");
    } finally {
      setSaving(null);
    }
  }

  async function handleDisappearingChange(value: string) {
    if (!userId) return;

    setDisappearing(value);
    setShowTimerPicker(false);
    setSaving("settingDisappearing");
    try {
      await updatePrivacySettings({
        userId: userId as Id<"users">,
        settingDisappearing: value as any,
      });
    } catch {
      setDisappearing(disappearing);
      toast.error("Failed to update setting");
    } finally {
      setSaving(null);
    }
  }

  const isLoading = userSettings === undefined;

  const privacySettingsList = [
    {
      id: "settingOnlineStatus",
      icon: Wifi,
      label: "Online Status",
      value: onlineStatus,
      setter: setOnlineStatus,
    },
    {
      id: "settingTyping",
      icon: Keyboard,
      label: "Typing Indicator",
      value: typing,
      setter: setTyping,
    },
    {
      id: "settingReadReceipts",
      icon: CheckCheck,
      label: "Read Receipts",
      value: readReceipts,
      setter: setReadReceipts,
    },
  ];

  return (
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
        {saving && (
          <div className="ml-auto w-4 h-4 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* ── Privacy Section ── */}
            <div>
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
                Privacy
              </p>
              <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
                {privacySettingsList.map((setting, index) => {
                  const Icon = setting.icon;
                  const isLast = index === privacySettingsList.length - 1;
                  const isSavingThis = saving === setting.id;

                  return (
                    <div key={setting.id}>
                      <div className="flex items-center justify-between px-3 py-3 bg-transparent hover:bg-accent/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-7 h-7 rounded-md ${setting.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <Icon size={15} />
                          </div>
                          <span className="text-[14px] font-medium text-foreground">
                            {setting.label}
                          </span>
                        </div>
                        
                        {isSavingThis ? (
                          <div className="w-4 h-4 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin mr-2" />
                        ) : (
                          <Toggle
                            checked={setting.value}
                            onChange={(val) =>
                              handleToggle(setting.id as any, val, setting.setter, setting.label)
                            }
                          />
                        )}
                      </div>
                      {!isLast && <div className="h-[1px] bg-border/40 ml-12" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Security Section ── */}
            <div>
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
                Security
              </p>
              <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
                <div
                  className="flex items-center justify-between px-3 py-3 bg-transparent hover:bg-accent/20 transition-colors cursor-pointer"
                  onClick={() => !saving && setShowTimerPicker((v) => !v)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-md ${disappearing !== "off" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Timer size={15} />
                    </div>
                    <span className="text-[14px] font-medium text-foreground">
                      Message Timer
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {saving === "settingDisappearing" ? (
                      <div className="w-4 h-4 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <span className="text-[12px] text-muted-foreground font-medium">
                          {TIMER_LABELS[disappearing]}
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
                      const isSelected = disappearing === option;
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

            {/* ── Notifications (Placeholder) ── */}
            <div className="opacity-50 pointer-events-none">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
                App
              </p>
              <div className="bg-card/30 border border-border/30 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground">
                      <Bell size={15} />
                    </div>
                    <span className="text-[14px] font-medium text-foreground">
                      Notifications
                    </span>
                  </div>
                  <Toggle checked={false} onChange={() => {}} disabled={true} />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}