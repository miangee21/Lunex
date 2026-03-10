// src/components/chat/list/ChatListFriends.tsx
import { Search, X, ArrowLeft } from "lucide-react";
import FriendListItemWithStatus from "@/components/chat/list/FriendListItemWithStatus";

interface Friend {
  userId: string;
  username: string;
  profilePicStorageId: string | null;
  isOnline: boolean;
  iBlockedThem?: boolean;
  chatPresetName?: string;
  chatBgColor?: string;
  myBubbleColor?: string;
  otherBubbleColor?: string;
  myTextColor?: string;
  otherTextColor?: string;
}

interface ChatListFriendsProps {
  friends: Friend[] | undefined;
  search: string;
  onSearchChange: (val: string) => void;
  onBack: () => void;
  onOpenChat: (friend: Friend & { isOnline: boolean }) => void;
}

export default function ChatListFriends({
  friends,
  search,
  onSearchChange,
  onBack,
  onOpenChat,
}: ChatListFriendsProps) {
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
          onClick={onBack}
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search friends..."
            autoFocus
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
          {search && (
            <button onClick={() => onSearchChange("")}>
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
                  onOpenChat({
                    userId: friend.userId,
                    username: friend.username,
                    profilePicStorageId: friend.profilePicStorageId,
                    isOnline,
                    chatPresetName: friend.chatPresetName,
                    chatBgColor: friend.chatBgColor,
                    myBubbleColor: friend.myBubbleColor,
                    otherBubbleColor: friend.otherBubbleColor,
                    myTextColor: friend.myTextColor,
                    otherTextColor: friend.otherTextColor,
                  });
                }}
              />
            ) : null,
          )
        )}
      </div>
    </div>
  );
}
