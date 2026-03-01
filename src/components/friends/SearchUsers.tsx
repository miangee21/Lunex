//src/components/friends/RequestItem.tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { ArrowLeft, Search, UserPlus, Clock, Users, X } from "lucide-react";
import { toast } from "sonner";

export default function SearchUsers() {
  const { setSidebarView } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const [search, setSearch] = useState("");

  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);

  const searchResults = useQuery(
    api.friends.searchUsers,
    search.length >= 2 && userId
      ? { username: search.toLowerCase(), currentUserId: userId }
      : "skip",
  );

  async function handleSendRequest(toUserId: string) {
    if (!userId) return;
    try {
      await sendFriendRequest({
        fromUserId: userId,
        toUserId: toUserId as never,
      });
      toast.success("Friend request sent!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send request.",
      );
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => setSidebarView("chats")}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-lg">Find People</h2>
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary border border-transparent transition-all">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
            placeholder="Search by username..."
            autoFocus
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X
                size={15}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {search.length < 2 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Users size={24} className="text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              Type at least 2 characters
            </p>
          </div>
        )}

        {search.length >= 2 && searchResults === undefined && (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {search.length >= 2 && searchResults?.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">No users found</p>
          </div>
        )}

        {searchResults?.map((user) => (
          <SearchUserItem
            key={user._id}
            userId={user._id}
            username={user.username}
            currentUserId={userId!}
            onSendRequest={handleSendRequest}
          />
        ))}
      </div>
    </div>
  );
}

function SearchUserItem({
  userId,
  username,
  currentUserId,
  onSendRequest,
}: {
  userId: string;
  username: string;
  currentUserId: string;
  onSendRequest: (id: string) => void;
}) {
  const relationship = useQuery(api.friends.getRelationshipStatus, {
    currentUserId: currentUserId as never,
    otherUserId: userId as never,
  });

  function renderAction() {
    if (relationship === undefined) {
      return (
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      );
    }

    if (!relationship) {
      return (
        <button
          onClick={() => onSendRequest(userId)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          <UserPlus size={13} />
          Add
        </button>
      );
    }

    if (relationship.status === "accepted") {
      return (
        <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
          <Users size={13} />
          Friends
        </span>
      );
    }

    if (
      relationship.status === "pending" &&
      relationship.direction === "sent"
    ) {
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
          <Clock size={13} />
          Sent
        </span>
      );
    }

    if (
      relationship.status === "pending" &&
      relationship.direction === "received"
    ) {
      return (
        <span className="flex items-center gap-1.5 text-primary text-xs font-bold">
          <Clock size={13} />
          Respond
        </span>
      );
    }
    if ((relationship.status as string) === "blocked") {
      return (
        <span className="text-destructive text-xs font-medium">Blocked</span>
      );
    }

    return (
      <button
        onClick={() => onSendRequest(userId)}
        className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity"
      >
        <UserPlus size={13} />
        Add
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors">
      <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
        {username[0].toUpperCase()}
      </div>
      <span className="text-foreground text-sm font-semibold flex-1 truncate">
        {username}
      </span>
      {renderAction()}
    </div>
  );
}
