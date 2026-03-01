//src/components/profile/ProfileFriendsList.tsx
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowLeft, Search, MoreVertical, UserX, Shield } from "lucide-react";

export default function ProfileFriendsList({ onBack }: { onBack: () => void }) {
  const userId = useAuthStore((s) => s.userId);
  const [friendSearch, setFriendSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip",
  );
  const unfriend = useMutation(api.friends.unfriend);
  const blockUser = useMutation(api.friends.blockUser);

  async function handleUnfriend(friendshipId: string, friendUsername: string) {
    try {
      await unfriend({ friendshipId: friendshipId as never });
      toast.success(`Unfriended ${friendUsername}!`);
      setMenuOpen(null);
    } catch {
      toast.error("Failed to unfriend.");
    }
  }

  async function handleBlock(friendUserId: string, friendUsername: string) {
    if (!userId) return;
    try {
      await blockUser({
        blockerId: userId,
        blockedId: friendUserId as never,
      });
      toast.success(`Blocked ${friendUsername}!`);
      setMenuOpen(null);
    } catch {
      toast.error("Failed to block user.");
    }
  }

  const actualFriends = (friends ?? []).filter((f) => f && !f.iBlockedThem);
  const filteredFriends = actualFriends.filter((f) =>
    f!.username.toLowerCase().includes(friendSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-lg">Friends</h2>
        <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {actualFriends.length}
        </span>
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={friendSearch}
            onChange={(e) => setFriendSearch(e.target.value)}
            placeholder="Search friends..."
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {friends === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">No friends found</p>
          </div>
        ) : (
          filteredFriends.map((friend) =>
            friend ? (
              <div
                key={friend.userId}
                className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors"
              >
                <UserAvatar
                  username={friend.username}
                  profilePicStorageId={
                    friend.profilePicStorageId as Id<"_storage"> | null
                  }
                  isGrayedOut={friend.hasBlockedMe || friend.iBlockedThem}
                />

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`text-sm font-semibold truncate ${
                      friend.hasBlockedMe || friend.iBlockedThem
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {friend.username}
                  </span>
                  {friend.hasBlockedMe && (
                    <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      Blocked you
                    </span>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpen(
                        menuOpen === friend.userId ? null : friend.userId,
                      )
                    }
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <MoreVertical size={15} />
                  </button>
                  {menuOpen === friend.userId && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-9 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                        <button
                          onClick={() =>
                            handleUnfriend(friend.friendshipId, friend.username)
                          }
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <UserX size={14} />
                          Unfriend
                        </button>
                        {!friend.iBlockedThem && (
                          <button
                            onClick={() =>
                              handleBlock(friend.userId, friend.username)
                            }
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Shield size={14} />
                            Block
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null,
          )
        )}
      </div>
    </div>
  );
}
