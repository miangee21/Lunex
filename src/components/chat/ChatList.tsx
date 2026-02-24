import { useChatStore } from "@/store/chatStore";
import ChatListItem from "@/components/chat/ChatListItem";
import RequestsPanel from "@/components/friends/RequestItem";
import { Search, Plus } from "lucide-react";
import { useState } from "react";

// Dummy chats for now — will be dynamic in Step 9
const DUMMY_CHATS = [
  {
    id: "1",
    username: "John1",
    lastMessage: "Hey! How are you doing?",
    time: "2m",
    unread: 3,
    isOnline: true,
  },
  {
    id: "2",
    username: "Beck2",
    lastMessage: "Let's catch up soon!",
    time: "1h",
    unread: 0,
    isOnline: false,
  },
];

export default function ChatList() {
  const { sidebarView, setSidebarView } = useChatStore();
  const [search, setSearch] = useState("");

  const filteredChats = DUMMY_CHATS.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  // Requests view
  if (sidebarView === "requests") {
    return <RequestsPanel />;
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-foreground font-bold text-lg">Chats</h2>
        <button
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
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">No chats found</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              id={chat.id}
              username={chat.username}
              lastMessage={chat.lastMessage}
              time={chat.time}
              unread={chat.unread}
              isOnline={chat.isOnline}
            />
          ))
        )}
      </div>

    </div>
  );
}