// src/components/sidebar/settings/SettingsTimerSection.tsx
import { Timer, CheckCheck, ChevronRight, Lock } from "lucide-react";

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

interface SettingsTimerSectionProps {
  currentDisappearing: string;
  showTimerPicker: boolean;
  savingTimer: boolean;
  onTogglePicker: () => void;
  onSelectTimer: (value: string) => void;
  isAppLockEnabled: boolean;
  onAppLockClick: () => void;
}

export default function SettingsTimerSection({
  currentDisappearing,
  showTimerPicker,
  savingTimer,
  onTogglePicker,
  onSelectTimer,
  isAppLockEnabled,
  onAppLockClick,
}: SettingsTimerSectionProps) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
        Security
      </p>
      <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
        <div
          className="flex items-center justify-between px-3 py-3 bg-transparent hover:bg-accent/20 transition-colors cursor-pointer"
          onClick={() => !savingTimer && onTogglePicker()}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-md ${
                currentDisappearing !== "off"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
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
                  className={`text-muted-foreground transition-transform duration-200 ${
                    showTimerPicker ? "rotate-90" : ""
                  }`}
                />
              </>
            )}
          </div>
        </div>

        <div
          className={`grid transition-all duration-200 ease-in-out ${
            showTimerPicker
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden bg-accent/5">
            <div className="h-px bg-border/40 ml-12" />
            {TIMER_OPTIONS.map((option) => {
              const isSelected = currentDisappearing === option;
              return (
                <button
                  key={option}
                  onClick={() => onSelectTimer(option)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent/30 transition-colors"
                >
                  <span
                    className={`text-[13px] ml-10 ${
                      isSelected
                        ? "text-primary font-medium"
                        : "text-foreground"
                    }`}
                  >
                    {TIMER_LABELS[option]}
                  </span>
                  {isSelected && (
                    <CheckCheck size={14} className="text-primary mr-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border/40 ml-12" />
        <button
          onClick={onAppLockClick}
          className="w-full flex items-center justify-between px-3 py-3 bg-transparent hover:bg-accent/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-md ${isAppLockEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              <Lock size={15} />
            </div>
            <span className="text-[14px] font-medium text-foreground">
              App Lock
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[12px] font-medium ${isAppLockEnabled ? "text-primary" : "text-muted-foreground"}`}
            >
              {isAppLockEnabled ? "On" : "Off"}
            </span>
            <ChevronRight
              size={16}
              className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
            />
          </div>
        </button>
      </div>
    </div>
  );
}
