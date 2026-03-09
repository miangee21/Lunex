//src/hooks/useDecryptMessages.ts
import { useState, useEffect } from "react";
import { decryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import { DecryptedMessage } from "@/types/chat";

type RawMessage = {
  id: string;
  encryptedContent: string;
  iv: string;
  sentAt: number;
  isOwn: boolean;
  senderId: string;
  type: string;
  mediaStorageId?: string | null;
  mediaIv?: string | null;
  mediaOriginalName?: string | null;
  mediaDeletedAt?: number | null;
  uploadBatchId?: string | null;
  reactions?: any[];
  editedAt?: number | null;
  disappearsAt?: number | null;
  readBy: { userId: string; time: number }[];
  deliveredTo: { userId: string; time: number }[];
  replyToMessageId?: string | null;
  isStarred?: boolean;
};

type Deps = {
  rawMessages: RawMessage[] | undefined;
  secretKey: Uint8Array | null | undefined;
  otherUserPublicKey: string | undefined;
  conversationId: string | undefined;
  updateLastMessageCache: (
    conversationId: string,
    data: {
      text: string;
      senderId: string;
      sentAt: number;
      type: string;
    },
  ) => void;
  updateReadByCache: (
    conversationId: string,
    readBy: { userId: string; time: number }[],
  ) => void;
  updateDeliveredToCache: (
    conversationId: string,
    deliveredTo: { userId: string; time: number }[],
  ) => void;
};

export function useDecryptMessages({
  rawMessages,
  secretKey,
  otherUserPublicKey,
  conversationId,
  updateLastMessageCache,
  updateReadByCache,
  updateDeliveredToCache,
}: Deps) {
  const [decryptedMessages, setDecryptedMessages] = useState<
    DecryptedMessage[]
  >([]);

  useEffect(() => {
    if (!rawMessages || !secretKey) return;

    async function decryptAll() {
      const result = await Promise.all(
        rawMessages!.map(async (msg) => {
          let text = "";
          try {
            if (msg.type === "system") {
              text = msg.encryptedContent;
            } else if (!otherUserPublicKey) {
              text = "🔒 Unable to decrypt message";
            } else {
              const theirPublicKey = base64ToKey(otherUserPublicKey);
              text = decryptMessage(
                { encryptedContent: msg.encryptedContent, iv: msg.iv },
                secretKey!,
                theirPublicKey,
              );
            }
          } catch {
            text = "🔒 Unable to decrypt message";
          }

          let decryptedReactions: Array<{ userId: string; emoji: string }> = [];
          if (msg.reactions && msg.reactions.length > 0) {
            decryptedReactions = msg.reactions.map((r: any) => {
              if (r.emoji) return { userId: r.userId, emoji: r.emoji };
              try {
                if (!otherUserPublicKey)
                  return { userId: r.userId, emoji: "🔒" };
                const theirPublicKey = base64ToKey(otherUserPublicKey);
                const decEmoji = decryptMessage(
                  { encryptedContent: r.encryptedEmoji, iv: r.iv },
                  secretKey!,
                  theirPublicKey,
                );
                return { userId: r.userId, emoji: decEmoji };
              } catch {
                return { userId: r.userId, emoji: "🔒" };
              }
            });
          }

          return {
            id: msg.id,
            text,
            time: new Date(msg.sentAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            timestamp: msg.sentAt,
            isOwn: msg.isOwn,
            senderId: msg.senderId,
            type: msg.type as "text" | "image" | "video" | "file" | "system",
            mediaStorageId: msg.mediaStorageId ?? null,
            mediaIv: msg.mediaIv ?? null,
            mediaOriginalName: msg.mediaOriginalName ?? null,
            mediaDeletedAt: msg.mediaDeletedAt ?? null,
            uploadBatchId: msg.uploadBatchId ?? null,
            reactions: decryptedReactions,
            editedAt: msg.editedAt ?? null,
            disappearsAt: msg.disappearsAt ?? null,
            readBy: msg.readBy,
            deliveredTo: msg.deliveredTo,
            replyToMessageId: msg.replyToMessageId ?? null,
            isStarred: (msg as any).isStarred,
          };
        }),
      );

      setDecryptedMessages(result);

      if (result.length > 0 && conversationId) {
        const last = result[result.length - 1];
        const lastRaw = rawMessages![rawMessages!.length - 1];
        updateLastMessageCache(conversationId, {
          text: last.text,
          senderId: last.senderId,
          sentAt: lastRaw.sentAt,
          type: lastRaw.type,
        });
        updateReadByCache(conversationId, lastRaw.readBy ?? []);
        updateDeliveredToCache(conversationId, lastRaw.deliveredTo ?? []);
      }
    }

    decryptAll();
  }, [rawMessages, secretKey, otherUserPublicKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDecryptedMessages((prev) =>
        prev
          .map((m) => {
            if (m.mediaStorageId && now - m.timestamp >= 6 * 60 * 60 * 1000) {
              return { ...m, mediaStorageId: null, mediaDeletedAt: now };
            }
            return m;
          })
          .filter((m) => !m.disappearsAt || m.disappearsAt > now),
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return { decryptedMessages, setDecryptedMessages };
}
