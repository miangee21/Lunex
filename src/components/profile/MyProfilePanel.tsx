import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowLeft, Search, MoreVertical, UserX, Shield, ShieldOff, Users, Ban, Palette } from "lucide-react";
import { toast } from "sonner";
import AvatarUpload from "@/components/profile/AvatarUpload";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import GlobalThemeCustomizer from "@/components/profile/GlobalThemeCustomizer";

type ProfileView = "main" | "friends" | "blocked" | "theme"; // ── ADDED "theme"

export default function MyProfilePanel() {
  const { setSidebarView } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);

  const [view, setView] = useState<ProfileView>("main");
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [blockedSearch, setBlockedSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip"
  );
  const blockedUsers = useQuery(
    api.friends.getBlockedUsers,
    userId ? { userId } : "skip"
  );
  const userRecord = useQuery(
    api.users.getUserById,
    userId ? { userId } : "skip"
  );

  const updateProfile = useMutation(api.users.updateUserProfile);
  const unfriend = useMutation(api.friends.unfriend);
  const blockUser = useMutation(api.friends.blockUser);
  const unblockUser = useMutation(api.friends.unblockUser);

  const bio = userRecord?.bio ?? "";

  async function handleBioBlur() {
    setEditingBio(false);
    if (bioValue.trim() !== bio && userId) {
      try {
        await updateProfile({ userId, bio: bioValue.trim() });
        toast.success("Bio updated!");
      } catch {
        toast.error("Failed to update bio.");
      }
    }
  }

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

  async function handleUnblock(recordId: string, friendUsername: string) {
    try {
      await unblockUser({ recordId: recordId as never });
      toast.success(`Unblocked ${friendUsername}!`);
      setMenuOpen(null);
    } catch {
      toast.error("Failed to unblock.");
    }
  }

  const actualFriends = (friends ?? []).filter((f) => f && !f.iBlockedThem);
  const filteredFriends = actualFriends.filter((f) =>
    f!.username.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const filteredBlocked = (blockedUsers ?? []).filter((b) =>
    b.username.toLowerCase().includes(blockedSearch.toLowerCase())
  );

  // ── THEME CUSTOMIZER VIEW ──
  if (view === "theme") {
    return <GlobalThemeCustomizer onBack={() => setView("main")} />;
  }

  // ── FRIENDS VIEW ──
  if (view === "friends") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => setView("main")}
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
            <Search size={15} className="text-muted-foreground flex-shrink-0" />
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
                    profilePicStorageId={friend.profilePicStorageId as Id<"_storage"> | null}
                    isGrayedOut={friend.hasBlockedMe || friend.iBlockedThem}
                  />

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-sm font-semibold truncate ${
                      friend.hasBlockedMe || friend.iBlockedThem
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }`}>
                      {friend.username}
                    </span>
                    {friend.hasBlockedMe && (
                      <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                        Blocked you
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === friend.userId ? null : friend.userId)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <MoreVertical size={15} />
                    </button>
                    {menuOpen === friend.userId && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-9 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                          <button
                            onClick={() => handleUnfriend(friend.friendshipId, friend.username)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <UserX size={14} />
                            Unfriend
                          </button>
                          {!friend.iBlockedThem && (
                            <button
                              onClick={() => handleBlock(friend.userId, friend.username)}
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
              ) : null
            )
          )}
        </div>
      </div>
    );
  }

  // ── BLOCKED VIEW ──
  if (view === "blocked") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => setView("main")}
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
            <Search size={15} className="text-muted-foreground flex-shrink-0" />
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
                  profilePicStorageId={user.profilePicStorageId as Id<"_storage"> | null}
                  isGrayedOut
                />
                <span className="text-muted-foreground text-sm font-semibold flex-1 truncate">
                  {user.username}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === user.userId ? null : user.userId)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <MoreVertical size={15} />
                  </button>
                  {menuOpen === user.userId && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-9 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                        <button
                          onClick={() => handleUnblock(user.recordId, user.username)}
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

  // ── MAIN PROFILE VIEW ──
  return (
    <div className="flex flex-col h-full animate-in slide-in-from-left-4 duration-300">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={() => setSidebarView("chats")}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-sm">My Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex flex-col items-center gap-3 py-6">
          <AvatarUpload />
          <div className="text-center">
            <p className="text-foreground font-bold text-lg">{username}</p>
            <p className="text-muted-foreground text-xs mt-0.5">@{username}</p>
          </div>
        </div>

        <div className="h-px bg-border mb-4" />

        {/* Bio */}
        <div className="mb-6">
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider mb-2">Bio</p>
          {editingBio ? (
            <>
              <textarea
                value={bioValue}
                onChange={(e) => setBioValue(e.target.value)}
                onBlur={handleBioBlur}
                maxLength={120}
                autoFocus
                rows={3}
                className="w-full bg-accent rounded-xl px-3 py-2 text-sm text-foreground outline-none resize-none border border-primary transition-colors"
              />
              <p className="text-muted-foreground text-xs mt-1 text-right">{bioValue.length}/120</p>
            </>
          ) : (
            <p
              onClick={() => { setEditingBio(true); setBioValue(bio); }}
              className="text-foreground text-sm leading-relaxed cursor-pointer hover:bg-accent rounded-xl px-3 py-2 transition-colors -mx-3"
            >
              {bio || "Click to add a bio..."}
            </p>
          )}
        </div>

        <div className="h-px bg-border mb-4" />

        {/* Actions Buttons */}
        <div className="flex flex-col gap-2 pb-6">
          
          {/* ── NEW: Customize Global Theme Button ── */}
          <button
            onClick={() => setView("theme")}
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Palette size={16} className="text-primary" />
              </div>
              <span className="text-foreground font-semibold text-sm">Customize Global Theme</span>
            </div>
          </button>

          <button
            onClick={() => setView("friends")}
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Users size={16} className="text-primary" />
              </div>
              <span className="text-foreground font-semibold text-sm">Friends</span>
            </div>
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">
              {actualFriends.length}
            </span>
          </button>

          <button
            onClick={() => setView("blocked")}
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <Ban size={16} className="text-destructive" />
              </div>
              <span className="text-foreground font-semibold text-sm">Blocked</span>
            </div>
            <span className="bg-destructive text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {blockedUsers?.length ?? 0}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}