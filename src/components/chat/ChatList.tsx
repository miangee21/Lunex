//src/components/chat/ChatList.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ChatListItemWithStatus from "@/components/chat/ChatListItemWithStatus";
import FriendListItemWithStatus from "@/components/chat/FriendListItemWithStatus";
import RequestsPanel from "@/components/friends/RequestItem";
import SearchUsers from "@/components/friends/SearchUsers";
import { Search, Plus, X, ArrowLeft, Trash2, Pin } from "lucide-react";
import DotsMenu from "@/components/sidebar/DotsMenu";
import { Id } from "../../../convex/_generated/dataModel";
import { decryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import SettingsPanel from "../sidebar/SettingsPanel";
import AboutPanel from "../sidebar/AboutPanel";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { toast } from "sonner";

export default function ChatList() {
  const {
    sidebarView,
    setActiveChat,
    setConversationId,
    lastMessageCache,
    readByCache,
    deliveredToCache,
    activeChat,
    setJumpToMessageId,
    seenReactions,
    triggerScrollToBottom,
    markReactionAsSeen,
    setSidebarView,
    isSelectionMode,
    selectedChats,
    selectAll,
    clearSelection,
  } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const [search, setSearch] = useState("");
  const [showFriends, setShowFriends] = useState(false);

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip",
  );

  const conversations = useQuery(
    api.conversations.getConversationsList,
    userId ? { userId } : "skip",
  );

  const getOrCreateConversation = useMutation(
    api.conversations.getOrCreateConversation,
  );

  const markAsDelivered = useMutation(api.messages.markAsDelivered);

  const currentUser = useQuery(
    api.users.getUserById,
    userId
      ? { userId: userId as Id<"users">, viewerId: userId as Id<"users"> }
      : "skip",
  );
  const pinnedChats = currentUser?.pinnedChats ?? [];
  const deleteChat = useMutation(api.conversations.deleteChat);
  const togglePinChat = useMutation(api.users.togglePinChat);

  async function handleMultiDelete() {
    if (!userId) return;
    try {
      await Promise.all(
        selectedChats.map((id) =>
          deleteChat({
            conversationId: id as Id<"conversations">,
            userId: userId as Id<"users">,
          }),
        ),
      );
      toast.success(`${selectedChats.length} chats deleted`);
      clearSelection();
    } catch {
      toast.error("Failed to delete chats");
    }
  }

  async function handleMultiPin() {
    if (!userId) return;
    try {
      let pinCount = 0;
      let unpinCount = 0;
      for (const id of selectedChats) {
        const res = await togglePinChat({
          conversationId: id as Id<"conversations">,
          userId: userId as Id<"users">,
        });
        if (res.success) {
          res.isPinned ? pinCount++ : unpinCount++;
        } else if (res.error) {
          toast.error(res.error);
          break;
        }
      }
      if (pinCount || unpinCount) toast.success(`Chats pinned/unpinned`);
      clearSelection();
    } catch {
      toast.error("Failed to pin chats");
    }
  }

  useEffect(() => {
    if (conversations && userId) {
      conversations.forEach((conv) => {
        if (conv && conv.unreadCount > 0) {
          markAsDelivered({
            conversationId: conv.conversationId as Id<"conversations">,
            userId: userId as Id<"users">,
          }).catch(console.error);
        }
      });
    }
  }, [conversations, userId, markAsDelivered]);

  if (sidebarView === "requests") return <RequestsPanel />;
  if (sidebarView === "search") return <SearchUsers />;
  if (sidebarView === "settings")
    return <SettingsPanel onBack={() => setSidebarView("chats")} />;
  if (sidebarView === "about")
    return <AboutPanel onBack={() => setSidebarView("chats")} />;

  async function handleOpenChat(friend: {
    userId: string;
    username: string;
    profilePicStorageId: string | null;
    isOnline: boolean;
    chatPresetName?: string;
    chatBgColor?: string;
    myBubbleColor?: string;
    otherBubbleColor?: string;
    myTextColor?: string;
    otherTextColor?: string;
  }) {
    if (!userId) return;

    setActiveChat({
      userId: friend.userId,
      username: friend.username,
      profilePicStorageId: friend.profilePicStorageId,
      isOnline: friend.isOnline,
      chatPresetName: friend.chatPresetName,
      chatBgColor: friend.chatBgColor,
      myBubbleColor: friend.myBubbleColor,
      otherBubbleColor: friend.otherBubbleColor,
      myTextColor: friend.myTextColor,
      otherTextColor: friend.otherTextColor,
    });

    const conversationId = await getOrCreateConversation({
      myUserId: userId,
      otherUserId: friend.userId as never,
    });

    setConversationId(conversationId);
  }

  if (showFriends) {
    const filteredFriends = (friends ?? []).filter(
      (f) =>
        f &&
        !f.iBlockedThem &&
        f.username.toLowerCase().includes(search.toLowerCase()),
    );

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            onClick={() => {
              setShowFriends(false);
              setSearch("");
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-foreground font-bold text-lg">Friends</h2>
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends..."
              autoFocus
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X
                  size={15}
                  className="text-muted-foreground hover:text-foreground"
                />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {friends === undefined ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-muted-foreground text-sm">No friends found</p>
            </div>
          ) : (
            filteredFriends.map((friend) =>
              friend ? (
                <FriendListItemWithStatus
                  key={friend.userId}
                  userId={friend.userId}
                  username={friend.username}
                  profilePicStorageId={friend.profilePicStorageId}
                  isOnline={friend.isOnline}
                  onSelect={(isOnline) => {
                    handleOpenChat({
                      userId: friend.userId,
                      username: friend.username,
                      profilePicStorageId: friend.profilePicStorageId,
                      isOnline: isOnline,
                      chatPresetName: (friend as any).chatPresetName,
                      chatBgColor: (friend as any).chatBgColor,
                      myBubbleColor: (friend as any).myBubbleColor,
                      otherBubbleColor: (friend as any).otherBubbleColor,
                      myTextColor: (friend as any).myTextColor,
                      otherTextColor: (friend as any).otherTextColor,
                    });
                    setShowFriends(false);
                    setSearch("");
                  }}
                />
              ) : null,
            )
          )}
        </div>
      </div>
    );
  }

  const filteredConversations = (conversations ?? []).filter((c) =>
    c?.username.toLowerCase().includes(search.toLowerCase()),
  );

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (!a || !b) return 0;

    if (isSelectionMode) {
      const aSelected = selectedChats.includes(a.conversationId);
      const bSelected = selectedChats.includes(b.conversationId);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
    }

    const aPinned = pinnedChats.includes(a.conversationId);
    const bPinned = pinnedChats.includes(b.conversationId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    return 0;
  });

  return (
    <div className="flex flex-col h-full relative">
      {isSelectionMode ? (
        <div className="flex items-center justify-between px-4 pt-4 pb-2 bg-accent/30 border-b border-border/40">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors -ml-1"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-foreground font-bold text-[16px]">
              {selectedChats.length} Selected
            </h2>
          </div>

          <button
            onClick={() => {
              const allIds =
                conversations
                  ?.filter((c) => c !== null)
                  .map((c) => c.conversationId) || [];
              if (selectedChats.length === allIds.length && allIds.length > 0) {
                selectAll([]);
              } else {
                selectAll(allIds);
              }
            }}
            className="text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            {conversations &&
            conversations.length > 0 &&
            selectedChats.length === conversations.length
              ? "Deselect All"
              : "Select All"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-foreground font-bold text-lg">Chats</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowFriends(true);
                setSearch("");
              }}
              className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
              title="New Chat"
            >
              <Plus size={18} />
            </button>
            <DotsMenu onSettingsClick={() => setSidebarView("settings")} />
          </div>
        </div>
      )}

      <div className="px-3 pb-3 mt-1.5">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X
                size={15}
                className="text-muted-foreground hover:text-foreground"
              />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-16">
        {conversations === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-muted-foreground text-sm">No chats yet</p>
            <button
              onClick={() => setShowFriends(true)}
              className="text-primary text-xs font-semibold hover:underline"
            >
              Find people to chat with
            </button>
          </div>
        ) : (
          sortedConversations.map((conv) => {
            if (!conv) return null;

            const cached = conv.conversationId
              ? lastMessageCache[conv.conversationId]
              : null;
            const msgSentAt = cached?.sentAt ?? conv.lastMessage?.sentAt ?? 0;
            const isReactionLatest =
              conv.lastReaction && conv.lastReaction.timestamp >= msgSentAt;

            const seenReactTs = conv.conversationId
              ? seenReactions[conv.conversationId] || 0
              : 0;
            const isReactionUnread =
              isReactionLatest &&
              conv.lastReaction &&
              conv.lastReaction.userId !== userId &&
              conv.lastReaction.timestamp > seenReactTs;

            return (
              <div
                key={conv.conversationId}
                onClickCapture={() => {
                  if (isReactionUnread && conv.lastReaction) {
                    setJumpToMessageId(conv.lastReaction.messageId);

                    markReactionAsSeen(conv.conversationId, Date.now());
                  } else {
                    setJumpToMessageId(null);

                    if (activeChat?.conversationId === conv.conversationId) {
                      triggerScrollToBottom();
                    }
                  }
                }}
              >
                <ChatListItemWithStatus
                  id={conv.otherUserId}
                  conversationId={conv.conversationId}
                  username={conv.username}
                  lastMessage={(() => {
                    if (isReactionLatest && conv.lastReaction) {
                      let emoji = "👍";
                      if (
                        activeChat?.conversationId === conv.conversationId &&
                        secretKey &&
                        conv.publicKey
                      ) {
                        try {
                          const theirPublicKey = base64ToKey(conv.publicKey);
                          emoji = decryptMessage(
                            {
                              encryptedContent:
                                conv.lastReaction.encryptedEmoji,
                              iv: conv.lastReaction.iv,
                            },
                            secretKey,
                            theirPublicKey,
                          );
                        } catch (e) {}
                      }
                      return conv.lastReaction.userId === userId
                        ? `You: Reacted ${emoji} to a message`
                        : `${emoji} Reacted to a message`;
                    }

                    const cached = conv.conversationId
                      ? lastMessageCache[conv.conversationId]
                      : null;
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
                      return cached.senderId === userId
                        ? `You: ${preview}`
                        : preview;
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
                  })()}
                  time={(() => {
                    if (isReactionLatest && conv.lastReaction) {
                      return new Date(
                        conv.lastReaction.timestamp,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      });
                    }
                    const cached = conv.conversationId
                      ? lastMessageCache[conv.conversationId]
                      : null;
                    const sentAt = cached?.sentAt ?? conv.lastMessage?.sentAt;
                    return sentAt
                      ? new Date(sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "";
                  })()}
                  isRead={(() => {
                    const cached = conv.conversationId
                      ? lastMessageCache[conv.conversationId]
                      : null;
                    if (!cached || cached.senderId !== userId) return undefined;
                    const readBy = conv.conversationId
                      ? readByCache[conv.conversationId]
                      : [];
                    const deliveredTo = conv.conversationId
                      ? deliveredToCache[conv.conversationId]
                      : [];
                    const otherUserId = conv.otherUserId;
                    if (readBy?.some((r) => r.userId === otherUserId))
                      return "read";
                    if (deliveredTo?.some((d) => d.userId === otherUserId))
                      return "delivered";
                    return "sent";
                  })()}
                  unread={conv.unreadCount + (isReactionUnread ? 1 : 0)}
                  isOnline={conv.isOnline}
                  profilePicStorageId={conv.profilePicStorageId ?? null}
                  isPinned={pinnedChats.includes(conv.conversationId)}
                  chatPresetName={(conv as any).chatPresetName}
                  chatBgColor={(conv as any).chatBgColor}
                  myBubbleColor={(conv as any).myBubbleColor}
                  otherBubbleColor={(conv as any).otherBubbleColor}
                  myTextColor={(conv as any).myTextColor}
                  otherTextColor={(conv as any).otherTextColor}
                />
              </div>
            );
          })
        )}
      </div>

      {isSelectionMode && selectedChats.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around animate-in slide-in-from-bottom-5 z-20">
          {selectedChats.length > 3 ? (
            <div
              className="flex flex-col items-center gap-1.5 text-muted-foreground opacity-40 cursor-not-allowed"
              title="You can only pin up to 3 chats"
            >
              <Pin size={20} />
              <span className="text-[11px] font-semibold">Max 3 Pins</span>
            </div>
          ) : (
            <button
              onClick={handleMultiPin}
              className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Pin size={20} />
              <span className="text-[11px] font-semibold">Pin/Unpin</span>
            </button>
          )}

          <ConfirmModal
            title="Delete Chats?"
            description={`Are you sure you want to delete ${selectedChats.length} selected chat(s)? This action cannot be undone.`}
            isDestructive={true}
            confirmText="Delete"
            onConfirm={handleMultiDelete}
          >
            <button className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={20} />
              <span className="text-[11px] font-semibold">Delete</span>
            </button>
          </ConfirmModal>
        </div>
      )}
    </div>
  );
}
