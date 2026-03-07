//src/components/profile/MyProfilePanel.tsx
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import AvatarUpload from "@/components/profile/AvatarUpload";
import GlobalThemeCustomizer from "@/components/profile/GlobalThemeCustomizer";
import ProfileFriendsList from "@/components/profile/ProfileFriendsList";
import ProfileBlockedList from "@/components/profile/ProfileBlockedList";
import { ArrowLeft, Users, Ban, Palette } from "lucide-react";

type ProfileView = "main" | "friends" | "blocked" | "theme";

export default function MyProfilePanel() {
  const { setSidebarView } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);

  const [view, setView] = useState<ProfileView>("main");
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip",
  );
  const blockedUsers = useQuery(
    api.friends.getBlockedUsers,
    userId ? { userId } : "skip",
  );
  const userRecord = useQuery(
    api.users.getUserById,
    userId ? { userId: userId as Id<"users">, viewerId: userId as Id<"users"> } : "skip",
  );
  const updateProfile = useMutation(api.users.updateUserProfile);

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

  const actualFriends = (friends ?? []).filter((f) => f && !f.iBlockedThem);

  if (view === "theme") {
    return <GlobalThemeCustomizer onBack={() => setView("main")} />;
  }

  if (view === "friends") {
    return <ProfileFriendsList onBack={() => setView("main")} />;
  }

  if (view === "blocked") {
    return <ProfileBlockedList onBack={() => setView("main")} />;
  }

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

        <div className="mb-6">
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider mb-2">
            Bio
          </p>
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
              <p className="text-muted-foreground text-xs mt-1 text-right">
                {bioValue.length}/120
              </p>
            </>
          ) : (
            <p
              onClick={() => {
                setEditingBio(true);
                setBioValue(bio);
              }}
              className="text-foreground text-sm leading-relaxed cursor-pointer hover:bg-accent rounded-xl px-3 py-2 transition-colors -mx-3"
            >
              {bio || "Click to add a bio..."}
            </p>
          )}
        </div>

        <div className="h-px bg-border mb-4" />

        <div className="flex flex-col gap-2 pb-6">
          <button
            onClick={() => setView("theme")}
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Palette size={16} className="text-primary" />
              </div>
              <span className="text-foreground font-semibold text-sm">
                Customize Global Theme
              </span>
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
              <span className="text-foreground font-semibold text-sm">
                Friends
              </span>
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
              <span className="text-foreground font-semibold text-sm">
                Blocked
              </span>
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
