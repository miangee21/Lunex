// src/components/sidebar/settings/SettingsPrivacySection.tsx
import { ChevronRight } from "lucide-react";
import type { PrivacyField } from "./SettingsPanel";

const PRIVACY_LABELS: Record<string, string> = {
  everyone: "Everyone",
  nobody: "Nobody",
  only_these: "Only these contacts",
  all_except: "All except...",
};

interface PrivacySetting {
  id: PrivacyField;
  icon: React.ElementType;
  label: string;
  currentValue: string;
}

interface SettingsPrivacySectionProps {
  privacySettingsList: PrivacySetting[];
  onOpenPrivacy: (field: PrivacyField) => void;
}

export default function SettingsPrivacySection({
  privacySettingsList,
  onOpenPrivacy,
}: SettingsPrivacySectionProps) {
  return (
    <>
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
                  onClick={() => onOpenPrivacy(setting.id)}
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
                    <span className="text-[12px] text-muted-foreground font-medium truncate max-w-30">
                      {PRIVACY_LABELS[setting.currentValue]}
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
                    />
                  </div>
                </button>
                {!isLast && <div className="h-px bg-border/40 ml-12" />}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
