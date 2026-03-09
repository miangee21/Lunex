//src/types/chat.ts
export type DecryptedMessage = {
  id: string;
  text: string;
  time: string;
  timestamp: number;
  isOwn: boolean;
  senderId: string;
  type: "text" | "image" | "video" | "file" | "system";
  mediaStorageId: string | null;
  mediaIv: string | null;
  mediaOriginalName: string | null;
  mediaDeletedAt: number | null;
  uploadBatchId: string | null;
  reactions: Array<{ userId: string; emoji: string }>;
  editedAt: number | null;
  disappearsAt: number | null;
  readBy: { userId: string; time: number }[];
  deliveredTo: { userId: string; time: number }[];
  replyToMessageId: string | null;
  isStarred?: boolean;
};
