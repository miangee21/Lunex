// src/components/chat/bubble/BubbleReactions.tsx
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { encryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { toast } from "sonner";

interface BubbleReactionsProps {
  messageId: string;
  reactions: Array<{ userId: string; emoji: string }>;
  isOwn: boolean;
  secretKey?: Uint8Array | null;
  otherUserPublicKey?: string;
}

export default function BubbleReactions({
  messageId,
  reactions,
  isOwn,
  secretKey,
  otherUserPublicKey,
}: BubbleReactionsProps) {
  const currentUserId = useAuthStore((s) => s.userId);
  const addReaction = useMutation(api.messages.addReaction);
  const removeReaction = useMutation(api.messages.removeReaction);

  if (reactions.length === 0) return null;

  const handleEmojiSelect = async (emoji: string) => {
    if (!currentUserId || !secretKey || !otherUserPublicKey) {
      toast.error("Encryption keys missing!");
      return;
    }
    const myExistingReaction = reactions.find(
      (r) => r.userId === currentUserId,
    );
    try {
      if (myExistingReaction && myExistingReaction.emoji === emoji) {
        await removeReaction({
          messageId: messageId as never,
          userId: currentUserId as never,
        });
      } else {
        const theirPublicKeyBytes = base64ToKey(otherUserPublicKey);
        const { encryptedContent, iv } = encryptMessage(
          emoji,
          secretKey,
          theirPublicKeyBytes,
        );
        await addReaction({
          messageId: messageId as never,
          userId: currentUserId as never,
          encryptedEmoji: encryptedContent,
          iv: iv,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const grouped = reactions.reduce(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasMine: false };
      acc[r.emoji].count += 1;
      if (r.userId === currentUserId) acc[r.emoji].hasMine = true;
      return acc;
    },
    {} as Record<string, { count: number; hasMine: boolean }>,
  );

  return (
    <div
      className={`absolute -bottom-5 ${isOwn ? "right-2" : "left-2"} flex flex-wrap gap-1 z-10 bg-background dark:bg-sidebar border border-border rounded-full p-0.5 shadow-sm`}
    >
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            handleEmojiSelect(emoji);
          }}
          className={`text-[11px] font-medium rounded-full px-1.5 py-0.5 flex items-center gap-1 transition-colors ${
            data.hasMine
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <span>{emoji}</span>
          {data.count > 1 && <span>{data.count}</span>}
        </button>
      ))}
    </div>
  );
}
