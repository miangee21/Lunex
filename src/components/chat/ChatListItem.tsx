import { useChatStore } from "@/store/chatStore";
import { useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";

interface ChatListItemProps {
  id: string;
  username: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
}

export default function ChatListItem({
  id,
  username,
  lastMessage,
  time,
  unread,
  isOnline,
}: ChatListItemProps) {
  const { setActiveChat, activeChatId } = useChatStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = activeChatId === id;

  return (
    <div
      onClick={() => setActiveChat(id, username)}
      className={`relative flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors group ${
        isActive
          ? "bg-accent"
          : "hover:bg-accent/50"
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-base">
          {username[0].toUpperCase()}
        </div>
        {/* Online dot */}
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-sidebar rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold text-sm truncate">
            {username}
          </span>
          <span className="text-muted-foreground text-xs flex-shrink-0 ml-1">
            {time}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-muted-foreground text-xs truncate">
            {lastMessage}
          </span>
          {unread > 0 && (
            <span className="ml-1 flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
      </div>

      {/* Three dots menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
        >
          <MoreVertical size={15} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 w-36 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} />
              Delete Chat
            </button>
          </div>
        )}
      </div>

      {/* Close menu on outside click */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}