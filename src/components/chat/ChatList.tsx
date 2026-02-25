import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ChatListItem from "@/components/chat/ChatListItem";
import RequestsPanel from "@/components/friends/RequestItem";
import SearchUsers from "@/components/friends/SearchUsers";
import { Search, Plus } from "lucide-react";
import { useState } from "react";

export default function ChatList() {
  const { sidebarView, setSidebarView } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const [search, setSearch] = useState("");

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip"
  );

  if (sidebarView === "requests") return <RequestsPanel />;
  if (sidebarView === "search") return <SearchUsers />;

  const filteredFriends = (friends ?? []).filter((f) =>
    f?.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-foreground font-bold text-lg">Chats</h2>
        <button
          onClick={() => setSidebarView("search")}
          className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
          title="Find People"
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
              onClick={() => setSidebarView("search")}
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
                lastMessage="Say hello! 👋"
                time=""
                unread={0}
                isOnline={friend.isOnline}
                profilePicStorageId={friend.profilePicStorageId ?? null} 
              />
            ) : null
          )
        )}
      </div>

    </div>
  );
}