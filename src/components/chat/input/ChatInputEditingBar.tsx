// src/components/chat/input/ChatInputEditingBar.tsx
import { Check, X } from "lucide-react";

interface ChatInputEditingBarProps {
  onCancel: () => void;
}

export default function ChatInputEditingBar({
  onCancel,
}: ChatInputEditingBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur-sm border-t border-border shadow-sm mb-2 rounded-xl mx-4">
      <div className="flex-1 min-w-0 flex items-center gap-2 text-primary">
        <Check size={14} />
        <span className="text-sm font-semibold">Editing Message</span>
      </div>
      <button
        onClick={onCancel}
        className="w-7 h-7 flex shrink-0 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors ml-3"
      >
        <X size={16} />
      </button>
    </div>
  );
}
