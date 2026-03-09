//src/components/chat/area/ChatAreaPinnedBar.tsx
import { Pin } from "lucide-react";
import { DecryptedMessage } from "@/types/chat";

type Props = {
  pinnedMessages: string[];
  currentPinnedIndex: number;
  decryptedMessages: DecryptedMessage[];
  onPinClick: () => void;
};

export default function ChatAreaPinnedBar({
  pinnedMessages,
  currentPinnedIndex,
  decryptedMessages,
  onPinClick,
}: Props) {
  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const targetId = pinnedMessages[currentPinnedIndex % pinnedMessages.length];
  const pMsg = decryptedMessages.find((m) => m.id === targetId);

  const previewText = (() => {
    if (!pMsg) return "Tap to view message...";
    if (pMsg.type === "text") return pMsg.text;
    return `Attachment: ${pMsg.type}`;
  })();

  return (
    <div
      className="bg-accent/40 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-accent/60 transition-colors z-10 shadow-sm"
      onClick={onPinClick}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <Pin size={16} className="text-primary shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-bold text-primary leading-tight">
            Pinned Message
          </span>
          <span className="text-[13px] text-muted-foreground truncate leading-tight">
            {previewText}
          </span>
        </div>
      </div>
      {pinnedMessages.length > 1 && (
        <div className="text-[11px] font-semibold text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full shrink-0">
          {(currentPinnedIndex % pinnedMessages.length) + 1}/
          {pinnedMessages.length}
        </div>
      )}
    </div>
  );
}
