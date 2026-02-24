import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { ArrowLeft, Search, MoreVertical, UserX, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import AvatarUpload from "@/components/profile/AvatarUpload";

type ProfileView = "main" | "friends" | "blocked";

const DUMMY_FRIENDS = [
  { id: "1", username: "yaram45", hasBlockedMe: false },
  { id: "2", username: "hassan12", hasBlockedMe: true },
];

const DUMMY_BLOCKED = [
  { id: "3", username: "sara56" },
];

export default function MyProfilePanel() {
  const { setSidebarView } = useChatStore();
  const username = useAuthStore((s) => s.username);

  const [view, setView] = useState<ProfileView>("main");
  const [bio, setBio] = useState("Hey there! I am using Lunex.");
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(bio);
  const [friendSearch, setFriendSearch] = useState("");
  const [blockedSearch, setBlockedSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filteredFriends = DUMMY_FRIENDS.filter((f) =>
    f.username.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const filteredBlocked = DUMMY_BLOCKED.filter((b) =>
    b.username.toLowerCase().includes(blockedSearch.toLowerCase())
  );

  function handleBioBlur() {
    setEditingBio(false);
    if (bioValue.trim() !== bio) {
      setBio(bioValue.trim());
      toast.success("Bio updated!");
    }
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
            {DUMMY_FRIENDS.length}
          </span>
        </div>

        {/* Search */}
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

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto">
          {filteredFriends.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground text-sm">No friends found</p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors"
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  friend.hasBlockedMe
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  {friend.username[0].toUpperCase()}
                </div>

                {/* Username + Badge */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-sm font-semibold truncate ${
                    friend.hasBlockedMe ? "text-muted-foreground" : "text-foreground"
                  }`}>
                    {friend.username}
                  </span>
                  {friend.hasBlockedMe && (
                    <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      Blocked you
                    </span>
                  )}
                </div>

                {/* Three dots */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === friend.id ? null : friend.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <MoreVertical size={15} />
                  </button>

                  {menuOpen === friend.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-9 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                        <button
                          onClick={() => {
                            toast.success(`Unfriended ${friend.username}!`);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <UserX size={14} />
                          Unfriend
                        </button>
                        <button
                          onClick={() => {
                            toast.success(`Blocked ${friend.username}!`);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Shield size={14} />
                          Block
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
            {DUMMY_BLOCKED.length}
          </span>
        </div>

        {/* Search */}
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

        {/* Blocked list */}
        <div className="flex-1 overflow-y-auto">
          {filteredBlocked.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground text-sm">No blocked users</p>
            </div>
          ) : (
            filteredBlocked.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm flex-shrink-0">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-muted-foreground text-sm font-semibold flex-1 truncate">
                  {user.username}
                </span>

                {/* Three dots */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <MoreVertical size={15} />
                  </button>

                  {menuOpen === user.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-9 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                        <button
                          onClick={() => {
                            toast.success(`Unblocked ${user.username}!`);
                            setMenuOpen(null);
                          }}
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
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => setSidebarView("chats")}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-lg">My Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4">

        {/* Avatar + Username */}
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
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">Bio</p>
          {editingBio ? (
            <textarea
              value={bioValue}
              onChange={(e) => setBioValue(e.target.value)}
              onBlur={handleBioBlur}
              maxLength={120}
              autoFocus
              rows={3}
              className="w-full bg-accent rounded-xl px-3 py-2 text-sm text-foreground outline-none resize-none border border-primary"
            />
          ) : (
            <p
              onClick={() => { setEditingBio(true); setBioValue(bio); }}
              className="text-foreground text-sm cursor-pointer hover:bg-accent rounded-xl px-3 py-2 transition-colors"
            >
              {bio || "Click to add a bio..."}
            </p>
          )}
          {editingBio && (
            <p className="text-muted-foreground text-xs mt-1 text-right">{bioValue.length}/120</p>
          )}
        </div>

        <div className="h-px bg-border mb-4" />

        {/* Friends + Blocked buttons */}
        <div className="flex flex-col gap-2 pb-6">
          <button
            onClick={() => setView("friends")}
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors"
          >
            <span className="text-foreground font-semibold text-sm">Friends</span>
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">
              {DUMMY_FRIENDS.length}
            </span>
          </button>

          <button
            onClick={() => setView("blocked")}
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors"
          >
            <span className="text-foreground font-semibold text-sm">Blocked</span>
            <span className="bg-destructive text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {DUMMY_BLOCKED.length}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}