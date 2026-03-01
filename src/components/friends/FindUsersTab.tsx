//src/components/friends/FindUsersTab.tsx
import { Search, X, Users, UserPlus, Clock } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface FindUsersTabProps {
  findSearch: string;
  setFindSearch: (val: string) => void;
  searchResults: any[] | undefined;
  currentUserId: string;
  handleSendRequest: (id: string) => void;
}

export default function FindUsersTab({
  findSearch,
  setFindSearch,
  searchResults,
  currentUserId,
  handleSendRequest,
}: FindUsersTabProps) {
  return (
    <>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 border border-transparent focus-within:border-primary transition-all">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            value={findSearch}
            onChange={(e) => setFindSearch(e.target.value.toLowerCase())}
            placeholder="Search by username..."
            autoFocus
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
          {findSearch && (
            <button onClick={() => setFindSearch("")}>
              <X
                size={15}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {findSearch.length < 2 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Users size={24} className="text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              Type at least 2 characters
            </p>
          </div>
        ) : searchResults === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">No users found</p>
          </div>
        ) : (
          searchResults.map((user) => (
            <FindUserItem
              key={user._id}
              userId={user._id}
              username={user.username}
              profilePicStorageId={user.profilePicStorageId ?? null}
              currentUserId={currentUserId}
              onSendRequest={handleSendRequest}
            />
          ))
        )}
      </div>
    </>
  );
}

function FindUserItem({
  userId,
  username,
  currentUserId,
  onSendRequest,
  profilePicStorageId,
}: {
  userId: string;
  username: string;
  currentUserId: string;
  onSendRequest: (id: string) => void;
  profilePicStorageId: string | null;
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
      <UserAvatar
        username={username}
        profilePicStorageId={profilePicStorageId as Id<"_storage"> | null}
      />
      <span className="text-foreground text-sm font-semibold flex-1 truncate">
        {username}
      </span>
      {renderAction()}
    </div>
  );
}
