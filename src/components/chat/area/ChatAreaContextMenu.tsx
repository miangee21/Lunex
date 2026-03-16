//src/components/chat/area/ChatAreaContextMenu.tsx
import { CheckSquare, X } from "lucide-react";

type Props = {
  contextMenu: { x: number; y: number } | null;
  onSelectMessages: () => void;
  onCloseChat: () => void;
};

export default function ChatAreaContextMenu({
  contextMenu,
  onSelectMessages,
  onCloseChat,
}: Props) {
  if (!contextMenu) return null;

  return (
    <div
      className="fixed z-100 w-48 bg-card border border-border shadow-xl rounded-xl overflow-hidden animate-in fade-in-80 zoom-in-95"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onSelectMessages();
        }}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
      >
        <CheckSquare size={14} className="text-muted-foreground" /> Select
        messages
      </button>
      <div className="h-px bg-border w-full" />
      <button
        onClick={() => {
          onCloseChat();
        }}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
      >
        <X size={14} /> Close chat
      </button>
    </div>
  );
}
