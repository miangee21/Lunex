//src/components/chat/misc/DisappearingPicker.tsx
import { useState } from "react";
import { ArrowLeft, Timer, Check } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

type TimerOption = "1h" | "6h" | "12h" | "1d" | "3d" | "7d";

const TIMER_OPTIONS: Array<{
  value: TimerOption;
  label: string;
  sublabel: string;
}> = [
  { value: "1h", label: "1 Hour", sublabel: "Messages vanish after 1 hour" },
  { value: "6h", label: "6 Hours", sublabel: "Messages vanish after 6 hours" },
  {
    value: "12h",
    label: "12 Hours",
    sublabel: "Messages vanish after 12 hours",
  },
  { value: "1d", label: "1 Day", sublabel: "Messages vanish after 1 day" },
  { value: "3d", label: "3 Days", sublabel: "Messages vanish after 3 days" },
  { value: "7d", label: "7 Days", sublabel: "Messages vanish after 7 days" },
];

interface DisappearingPickerProps {
  onBack: () => void;
}

export default function DisappearingPicker({
  onBack,
}: DisappearingPickerProps) {
  const { activeChat, syncDisappearing } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const setDisappearing = useMutation(api.conversations.setDisappearing);
  const sendMessage = useMutation(api.messages.sendMessage);

  const isOn = activeChat?.disappearingMode ?? false;
  const currentTimer = activeChat?.disappearingTimer;
  const setBy = activeChat?.disappearingSetBy;

  const isDisabled = isOn && setBy !== userId;

  const [selected, setSelected] = useState<TimerOption | null>(
    currentTimer ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!activeChat?.conversationId || !userId) return;
    if (isDisabled) return;

    setIsSaving(true);
    try {
      await setDisappearing({
        conversationId: activeChat.conversationId as Id<"conversations">,
        userId: userId as Id<"users">,
        timer: selected ?? undefined,
      });

      const isTurningOn = selected !== null;
      const isTurningOff = isOn && selected === null;

      if (isTurningOn && !isOn) {
        const label =
          TIMER_OPTIONS.find((o) => o.value === selected)?.label ?? "";
        await sendMessage({
          conversationId: activeChat.conversationId as Id<"conversations">,
          senderId: userId as Id<"users">,
          encryptedContent: `Disappearing messages on • ${label}`,
          iv: "system",
          type: "system",
        });
      } else if (isTurningOff) {
        await sendMessage({
          conversationId: activeChat.conversationId as Id<"conversations">,
          senderId: userId as Id<"users">,
          encryptedContent: "Disappearing messages turned off",
          iv: "system",
          type: "system",
        });
      }

      syncDisappearing(
        isTurningOn ? true : undefined,
        isTurningOn ? selected! : undefined,
        isTurningOn ? userId : undefined,
      );

      toast.success(
        isTurningOn
          ? `Disappearing messages on • ${TIMER_OPTIONS.find((o) => o.value === selected)?.label}`
          : "Disappearing messages turned off",
      );
      onBack();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update disappearing messages");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-sidebar animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-sm flex-1">
          Disappearing Messages
        </h2>
        {isOn && (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            On
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-4 mt-4 mb-2 px-4 py-3 rounded-2xl bg-primary/8 border border-primary/20 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Timer size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm mb-0.5">
              Auto-delete messages
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              New messages will disappear from this chat after the selected
              time. Media files always delete after 6 hours regardless.
            </p>
          </div>
        </div>

        {isDisabled && (
          <div className="mx-4 mt-2 mb-2 px-4 py-2.5 rounded-2xl bg-destructive/8 border border-destructive/20">
            <p className="text-destructive text-xs font-medium">
              {activeChat?.username} has enabled disappearing messages. Only
              they can change this setting.
            </p>
          </div>
        )}

        <div className="px-4 mt-4 mb-2">
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider mb-2 px-1">
            Timer
          </p>
          <button
            disabled={isDisabled}
            onClick={() => setSelected(null)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors mb-1
              ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              ${
                selected === null
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-accent hover:bg-accent/70 border border-transparent"
              }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                ${selected === null ? "bg-primary/20" : "bg-muted"}`}
              >
                <span className="text-base">🚫</span>
              </div>
              <div className="text-left">
                <p
                  className={`font-semibold text-sm ${selected === null ? "text-primary" : "text-foreground"}`}
                >
                  Off
                </p>
                <p className="text-xs text-muted-foreground">
                  Messages won't disappear
                </p>
              </div>
            </div>
            {selected === null && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Check
                  size={12}
                  className="text-primary-foreground"
                  strokeWidth={3}
                />
              </div>
            )}
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex flex-col gap-1">
            {TIMER_OPTIONS.map((option) => {
              const isSelected = selected === option.value;
              return (
                <button
                  key={option.value}
                  disabled={isDisabled}
                  onClick={() => setSelected(option.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors
                    ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-accent hover:bg-accent/70 border border-transparent"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                      ${isSelected ? "bg-primary/20" : "bg-muted"}`}
                    >
                      <Timer
                        size={15}
                        className={
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }
                      />
                    </div>
                    <div className="text-left">
                      <p
                        className={`font-semibold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}
                      >
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {option.sublabel}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check
                        size={12}
                        className="text-primary-foreground"
                        strokeWidth={3}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!isDisabled && (
        <div className="px-4 py-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={isSaving || selected === currentTimer}
            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all
              ${
                isSaving || selected === currentTimer
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
              }`}
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
