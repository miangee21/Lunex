// src/components/sidebar/settings/SettingsPanel.tsx
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Id } from "../../../../convex/_generated/dataModel";
import PrivacySelectorModal from "./PrivacySelectorModal";
import SettingsPrivacySection from "./SettingsPrivacySection";
import SettingsTimerSection from "./SettingsTimerSection";
import { useAppLockStore } from "@/store/appLockStore";
import { useSettingsStore } from "@/store/settingsStore";
import AppLockPanel from "./AppLockPanel";
import { toast } from "sonner";
import {
  ArrowLeft,
  Wifi,
  Keyboard,
  CheckCheck,
  Bell,
  ChevronRight,
  AppWindow,
} from "lucide-react";

interface SettingsPanelProps {
  onBack: () => void;
}

const PRIVACY_LABELS: Record<string, string> = {
  everyone: "Everyone",
  nobody: "Nobody",
  only_these: "Only these contacts",
  all_except: "All except...",
};

export type PrivacyField =
  | "privacyOnline"
  | "privacyTyping"
  | "privacyReadReceipts"
  | "privacyNotifications";

export default function SettingsPanel({ onBack }: SettingsPanelProps) {
  const userId = useAuthStore((s) => s.userId);
  const updateGlobalDisappearingSetting = useMutation(
    api.users.updateGlobalDisappearingSetting,
  );

  const userSettings = useQuery(
    api.presence.getUserSettings,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const currentUser = useQuery(
    api.users.getUserById,
    userId
      ? { userId: userId as Id<"users">, viewerId: userId as Id<"users"> }
      : "skip",
  );

  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [savingTimer, setSavingTimer] = useState(false);
  const [activePrivacyField, setActivePrivacyField] =
    useState<PrivacyField | null>(null);
  const [showAppLock, setShowAppLock] = useState(false);

  const isAppLockEnabled = useAppLockStore((s) => s.isAppLockEnabled);
  const { isTrayEnabled, setTrayEnabled } = useSettingsStore();

  async function handleDisappearingChange(value: string) {
    if (!userId) return;
    setShowTimerPicker(false);
    setSavingTimer(true);
    try {
      await updateGlobalDisappearingSetting({
        userId: userId as Id<"users">,
        timer: value === "off" ? undefined : (value as any),
      });
      toast.success(
        `Default timer set to ${
          {
            off: "Off",
            "1h": "1 Hour",
            "6h": "6 Hours",
            "12h": "12 Hours",
            "1d": "1 Day",
            "3d": "3 Days",
            "7d": "7 Days",
          }[value]
        }`,
      );
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setSavingTimer(false);
    }
  }

  const isLoading = userSettings === undefined;

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
  const themeMode = currentUser?.theme === "dark" ? "dark" : "light";
  const themeClass = currentUser?.globalPreset
    ? `theme-${currentUser.globalPreset.toLowerCase()}`
    : "";

  return (
    <>
      {showAppLock ? (
        <AppLockPanel onBack={() => setShowAppLock(false)} />
      ) : (
        <div
          className={`flex flex-col h-full bg-sidebar animate-in slide-in-from-left-4 duration-200 ${themeMode} ${themeClass}`}
        >
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40 shrink-0">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-foreground font-semibold text-[15px]">
              Settings
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-5 h-5 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                <SettingsPrivacySection
                  privacySettingsList={privacySettingsList}
                  onOpenPrivacy={setActivePrivacyField}
                />
                <SettingsTimerSection
                  currentDisappearing={currentDisappearing}
                  showTimerPicker={showTimerPicker}
                  savingTimer={savingTimer}
                  onTogglePicker={() => setShowTimerPicker((v) => !v)}
                  onSelectTimer={handleDisappearingChange}
                  isAppLockEnabled={isAppLockEnabled}
                  onAppLockClick={() => setShowAppLock(true)}
                />
                <div className="pb-6">
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
                    App
                  </p>
                  <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <button
                      onClick={() =>
                        setActivePrivacyField("privacyNotifications")
                      }
                      className="w-full flex items-center justify-between px-3 py-3 bg-transparent hover:bg-accent/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
                          <Bell size={15} />
                        </div>
                        <span className="text-[14px] font-medium text-foreground">
                          Notifications
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-muted-foreground font-medium truncate max-w-30">
                          {
                            PRIVACY_LABELS[
                              userSettings?.privacyNotifications ?? "everyone"
                            ]
                          }
                        </span>
                        <ChevronRight
                          size={16}
                          className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
                        />
                      </div>
                    </button>

                    <div className="h-1px bg-border/40 w-full" />
                    <div className="w-full flex items-center justify-between px-3 py-3 bg-transparent">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
                          <AppWindow size={15} />
                        </div>
                        <span className="text-[14px] font-medium text-foreground">
                          System Tray Icon
                        </span>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            const newState = !isTrayEnabled;
                            setTrayEnabled(newState);
                            toast.success(
                              `System Tray Icon ${newState ? "Enabled" : "Disabled"}`,
                            );
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isTrayEnabled ? "bg-primary" : "bg-muted"
                          }`}
                          role="switch"
                          aria-checked={isTrayEnabled}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isTrayEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activePrivacyField && userSettings && (
        <PrivacySelectorModal
          isOpen={!!activePrivacyField}
          onClose={() => setActivePrivacyField(null)}
          field={activePrivacyField}
          currentValue={
            activePrivacyField === "privacyOnline"
              ? userSettings.privacyOnline
              : activePrivacyField === "privacyTyping"
                ? userSettings.privacyTyping
                : activePrivacyField === "privacyNotifications"
                  ? userSettings.privacyNotifications
                  : userSettings.privacyReadReceipts
          }
          currentExceptions={
            activePrivacyField === "privacyOnline"
              ? userSettings.onlineExceptions
              : activePrivacyField === "privacyTyping"
                ? userSettings.typingExceptions
                : activePrivacyField === "privacyNotifications"
                  ? userSettings.notificationExceptions
                  : userSettings.readReceiptsExceptions
          }
        />
      )}
    </>
  );
}
