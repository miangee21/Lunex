//src/components/profile/ProfileFriendsList.tsx
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowLeft, Search, MoreVertical, ShieldOff } from "lucide-react";

export default function ProfileBlockedList({ onBack }: { onBack: () => void }) {
  const userId = useAuthStore((s) => s.userId);
  const [blockedSearch, setBlockedSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const blockedUsers = useQuery(
    api.friends.getBlockedUsers,
    userId ? { userId } : "skip",
  );

  const unblockUser = useMutation(api.friends.unblockUser);

  async function handleUnblock(recordId: string, friendUsername: string) {
    try {
      await unblockUser({ recordId: recordId as never });
      toast.success(`Unblocked ${friendUsername}!`);
      setMenuOpen(null);
    } catch {
      toast.error("Failed to unblock.");
    }
  }

  const filteredBlocked = (blockedUsers ?? []).filter((b) =>
    b.username.toLowerCase().includes(blockedSearch.toLowerCase()),
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
        <h2 className="text-foreground font-bold text-lg">Blocked</h2>
        <span className="ml-auto bg-destructive text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {blockedUsers?.length ?? 0}
        </span>
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={blockedSearch}
            onChange={(e) => setBlockedSearch(e.target.value)}
            placeholder="Search blocked..."
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {blockedUsers === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredBlocked.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">No blocked users</p>
          </div>
        ) : (
          filteredBlocked.map((user) => (
            <div
              key={user.userId}
              className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors"
            >
              <UserAvatar
                username={user.username}
                profilePicStorageId={
                  user.profilePicStorageId as Id<"_storage"> | null
                }
                isGrayedOut
              />
              <span className="text-muted-foreground text-sm font-semibold flex-1 truncate">
                {user.username}
              </span>
              <div className="relative">
                <button
                  onClick={() =>
                    setMenuOpen(menuOpen === user.userId ? null : user.userId)
                  }
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                >
                  <MoreVertical size={15} />
                </button>
                {menuOpen === user.userId && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(null)}
                    />
                    <div className="absolute right-0 top-9 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                      <button
                        onClick={() =>
                          handleUnblock(user.recordId, user.username)
                        }
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <ShieldOff size={14} />
                        Unblock
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
