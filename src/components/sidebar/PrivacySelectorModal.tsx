// src/components/sidebar/PrivacySelectorModal.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Shield } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PrivacyField } from "./SettingsPanel";
import ContactPicker from "./ContactPicker";

interface PrivacySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: PrivacyField;
  currentValue: string;
  currentExceptions: string[];
}

const HEADER_LABELS: Record<PrivacyField, string> = {
  privacyOnline: "Online Status",
  privacyTyping: "Typing Indicator",
  privacyReadReceipts: "Read Receipts",
  privacyNotifications: "Notifications",
};

const OPTIONS = [
  { id: "everyone", label: "Everyone", description: "Anyone can see this" },
  { id: "nobody", label: "Nobody", description: "Hide from everyone" },
  {
    id: "only_these",
    label: "Only these contacts...",
    description: "Share only with selected people",
  },
  {
    id: "all_except",
    label: "All except...",
    description: "Hide from selected people",
  },
];

export default function PrivacySelectorModal({
  isOpen,
  onClose,
  field,
  currentValue,
  currentExceptions,
}: PrivacySelectorModalProps) {
  const userId = useAuthStore((s) => s.userId);
  const updatePrivacySettings = useMutation(api.presence.updatePrivacySettings);

  const [saving, setSaving] = useState(false);

  const [showContactPicker, setShowContactPicker] = useState(false);
  const [pendingOption, setPendingOption] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleOptionClick(optionId: string) {
    if (!userId) return;

    if (optionId === "only_these" || optionId === "all_except") {
      setPendingOption(optionId);
      setShowContactPicker(true);
      return;
    }

    setSaving(true);
    try {
      const exceptionField =
        field === "privacyOnline"
          ? "onlineExceptions"
          : field === "privacyTyping"
            ? "typingExceptions"
            : field === "privacyNotifications"
              ? "notificationExceptions"
              : "readReceiptsExceptions";

      await updatePrivacySettings({
        userId: userId as Id<"users">,
        [field]: optionId as any,
        [exceptionField]: [],
      });

      toast.success("Privacy updated successfully");
      onClose();
    } catch {
      toast.error("Failed to update privacy");
    } finally {
      setSaving(false);
    }
  }

  if (showContactPicker && pendingOption) {
    return (
      <ContactPicker
        field={field}
        selectedOption={pendingOption}
        currentExceptions={currentExceptions?.filter((e) => e !== null) || []}
        onBack={() => setShowContactPicker(false)}
        onClose={onClose}
      />
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ pointerEvents: "auto" }}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[320px] bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 m-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield size={16} className="text-primary" />
            </div>
            <h3 className="font-semibold text-[15px] text-foreground">
              {HEADER_LABELS[field]}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-2">
          {OPTIONS.map((option) => {
            const isSelected = currentValue === option.id;

            return (
              <button
                key={option.id}
                onClick={() => !saving && handleOptionClick(option.id)}
                disabled={saving}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-colors
                  ${isSelected ? "bg-primary/10" : "hover:bg-accent/40 bg-transparent"}
                  ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div className="flex flex-col items-start text-left">
                  <span
                    className={`text-[14.5px] font-medium ${isSelected ? "text-primary" : "text-foreground"}`}
                  >
                    {option.label}
                  </span>
                  <span className="text-[12px] text-muted-foreground mt-0.5">
                    {option.description}
                  </span>
                </div>

                {isSelected && !saving && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}

                {saving && isSelected && (
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
