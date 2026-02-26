import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ChatListItem from "@/components/chat/ChatListItem";
import RequestsPanel from "@/components/friends/RequestItem";
import SearchUsers from "@/components/friends/SearchUsers";
import { Search, Plus, X, ArrowLeft } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";

export default function ChatList() {
  const { sidebarView, setSidebarView, setActiveChat } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const [search, setSearch] = useState("");
  const [showFriends, setShowFriends] = useState(false);

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip"
  );

  if (sidebarView === "requests") return <RequestsPanel />;
  if (sidebarView === "search") return <SearchUsers />;

  // ── FRIENDS LIST (plus button) ──
  if (showFriends) {
    const filteredFriends = (friends ?? []).filter(
      (f) => f && !f.iBlockedThem &&
        f.username.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            onClick={() => { setShowFriends(false); setSearch(""); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-foreground font-bold text-lg">Friends</h2>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
            <Search size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends..."
              autoFocus
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={15} className="text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Friends list */}
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
                <button
                  key={friend.userId}
                  onClick={() => {
                    setActiveChat({
                      userId: friend.userId,
                      username: friend.username,
                      profilePicStorageId: friend.profilePicStorageId,
                      isOnline: friend.isOnline,
                      // ── NEW: Pass all theme variables down to the store ──
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
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors"
                >
                  <UserAvatar
                    username={friend.username}
                    profilePicStorageId={friend.profilePicStorageId as Id<"_storage"> | null}
                    isOnline={friend.isOnline}
                  />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-foreground text-sm font-semibold truncate">
                      {friend.username}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {friend.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </button>
              ) : null
            )
          )}
        </div>
      </div>
    );
  }

  // ── CHAT LIST ──
  const filteredFriends = (friends ?? []).filter((f) =>
    f?.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-foreground font-bold text-lg">Chats</h2>
        <button
          onClick={() => { setShowFriends(true); setSearch(""); }}
          className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
          title="New Chat"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={15} className="text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {friends === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredFriends.length === 0 ? (
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
          filteredFriends.map((friend) =>
            friend ? (
              <ChatListItem
                key={friend.userId}
                id={friend.userId}
                username={friend.username}
                lastMessage={friend.hasBlockedMe ? "🚫 This user blocked you" : friend.iBlockedThem ? "🚫 You blocked this user" : "Say hello! 👋"}
                time=""
                unread={0}
                isOnline={friend.isOnline}
                profilePicStorageId={friend.profilePicStorageId ?? null}
                // ── NEW: Pass the theme variables from the DB to ChatListItem ──
                chatPresetName={(friend as any).chatPresetName}
                chatBgColor={(friend as any).chatBgColor}
                myBubbleColor={(friend as any).myBubbleColor}
                otherBubbleColor={(friend as any).otherBubbleColor}
                myTextColor={(friend as any).myTextColor}
                otherTextColor={(friend as any).otherTextColor}
              />
            ) : null
          )
        )}
      </div>

    </div>
  );
}