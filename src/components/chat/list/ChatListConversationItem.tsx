// src/components/chat/list/ChatListConversationItem.tsx
import ChatListItemWithStatus from "@/components/chat/list/ChatListItemWithStatus";

interface LastMessage {
  type: string;
  text: string;
  senderId: string;
  sentAt: number;
}

interface LastReaction {
  userId: string;
  messageId: string;
  timestamp: number;
  encryptedEmoji: string;
  iv: string;
}

interface ConversationItemProps {
  conv: {
    conversationId: string;
    otherUserId: string;
    username: string;
    isOnline: boolean;
    profilePicStorageId?: string | null;
    unreadCount: number;
    publicKey?: string;
    lastMessage?: LastMessage | null;
    lastReaction?: LastReaction | null;
    chatPresetName?: string;
    chatBgColor?: string;
    myBubbleColor?: string;
    otherBubbleColor?: string;
    myTextColor?: string;
    otherTextColor?: string;
  };
  userId: string | null;
  pinnedChats: string[];
  lastMessageCache: Record<string, any>;
  readByCache: Record<string, any[]>;
  deliveredToCache: Record<string, any[]>;
  seenReactions: Record<string, number>;
  isReactionLatest: boolean;
  isReactionUnread: boolean | null | undefined;
  decryptedEmoji: string;
  onClickCapture: () => void;
}

export default function ChatListConversationItem({
  conv,
  userId,
  pinnedChats,
  lastMessageCache,
  readByCache,
  deliveredToCache,
  isReactionLatest,
  isReactionUnread,
  decryptedEmoji,
  onClickCapture,
}: ConversationItemProps) {
  const cached = conv.conversationId
    ? lastMessageCache[conv.conversationId]
    : null;

  const lastMessage = (() => {
    if (isReactionLatest && conv.lastReaction) {
      return conv.lastReaction.userId === userId
        ? `You: Reacted ${decryptedEmoji} to a message`
        : `${decryptedEmoji} Reacted to a message`;
    }
    if (cached) {
      if (cached.type === "image")
        return cached.senderId === userId
          ? "You: 📷 New photo"
          : "📷 New photo";
      if (cached.type === "video")
        return cached.senderId === userId
          ? "You: 🎥 New video"
          : "🎥 New video";
      if (cached.type === "audio")
        return cached.senderId === userId
          ? "You: 🎵 New audio"
          : "🎵 New audio";
      if (cached.type === "file")
        return cached.senderId === userId
          ? "You: 📎 New document"
          : "📎 New document";
      const preview =
        cached.text.length > 40
          ? cached.text.slice(0, 40) + "..."
          : cached.text;
      return cached.senderId === userId ? `You: ${preview}` : preview;
    }
    if (conv.lastMessage) {
      if (conv.lastMessage.type === "image")
        return conv.lastMessage.senderId === userId
          ? "You: 📷 New photo"
          : "📷 New photo";
      if (conv.lastMessage.type === "video")
        return conv.lastMessage.senderId === userId
          ? "You: 🎥 New video"
          : "🎥 New video";
      if (conv.lastMessage.type === "audio")
        return conv.lastMessage.senderId === userId
          ? "You: 🎵 New audio"
          : "🎵 New audio";
      if (conv.lastMessage.type === "file")
        return conv.lastMessage.senderId === userId
          ? "You: 📎 New document"
          : "📎 New document";
      return conv.lastMessage.senderId === userId
        ? "You: New message"
        : "New message 📩";
    }
    return "Say hello! 👋";
  })();

  const time = (() => {
    if (isReactionLatest && conv.lastReaction) {
      return new Date(conv.lastReaction.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    const sentAt = cached?.sentAt ?? conv.lastMessage?.sentAt;
    return sentAt
      ? new Date(sentAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";
  })();

  const isRead = (() => {
    if (!cached || cached.senderId !== userId) return undefined;
    const readBy = conv.conversationId ? readByCache[conv.conversationId] : [];
    const deliveredTo = conv.conversationId
      ? deliveredToCache[conv.conversationId]
      : [];
    if (readBy?.some((r: any) => r.userId === conv.otherUserId)) return "read";
    if (deliveredTo?.some((d: any) => d.userId === conv.otherUserId))
      return "delivered";
    return "sent";
  })();

  return (
    <div onClickCapture={onClickCapture}>
      <ChatListItemWithStatus
        id={conv.otherUserId}
        conversationId={conv.conversationId}
        username={conv.username}
        lastMessage={lastMessage}
        time={time}
        isRead={isRead as any}
        unread={conv.unreadCount + (isReactionUnread ? 1 : 0)}
        isOnline={conv.isOnline}
        profilePicStorageId={conv.profilePicStorageId ?? null}
        isPinned={pinnedChats.includes(conv.conversationId)}
        chatPresetName={conv.chatPresetName}
        chatBgColor={conv.chatBgColor}
        myBubbleColor={conv.myBubbleColor}
        otherBubbleColor={conv.otherBubbleColor}
        myTextColor={conv.myTextColor}
        otherTextColor={conv.otherTextColor}
      />
    </div>
  );
}
