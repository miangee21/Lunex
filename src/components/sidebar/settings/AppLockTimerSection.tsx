// src/components/sidebar/settings/AppLockTimerSection.tsx
import { Timer } from "lucide-react";
import { useAppLockStore } from "@/store/appLockStore";

const AUTO_LOCK_OPTIONS = [
  { value: "1min", label: "1 Minute" },
  { value: "5min", label: "5 Minutes" },
  { value: "30min", label: "30 Minutes" },
  { value: "1hr", label: "1 Hour" },
] as const;

export default function AppLockTimerSection() {
  const autoLockTimer = useAppLockStore((s) => s.autoLockTimer);
  const setAutoLockTimer = useAppLockStore((s) => s.setAutoLockTimer);

  return (
    <div>
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
        Auto-lock after
      </p>
      <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
        {AUTO_LOCK_OPTIONS.map((opt, idx) => (
          <button
            key={opt.value}
            onClick={() => setAutoLockTimer(opt.value)}
            className={`w-full flex items-center justify-between px-3 py-3 hover:bg-accent/20 transition-colors ${
              idx !== AUTO_LOCK_OPTIONS.length - 1
                ? "border-b border-border/30"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-md ${
                  autoLockTimer === opt.value
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Timer size={14} />
              </div>
              <span
                className={`text-[14px] font-medium ${
                  autoLockTimer === opt.value
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {opt.label}
              </span>
            </div>
            {autoLockTimer === opt.value && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
