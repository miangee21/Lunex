//src/components/profile/OtherUserPanel.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Id } from "../../../convex/_generated/dataModel";
import UserAvatar from "@/components/shared/UserAvatar";
import { X, UserX, Shield, ShieldOff, Timer, Palette } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import ChatThemeCustomizer from "@/components/chat/ChatThemeCustomizer";

export default function OtherUserPanel() {
  const { activeChat, setProfilePanelOpen, clearActiveChat } = useChatStore();
  const userId = useAuthStore((s) => s.userId);

  const [view, setView] = useState<"profile" | "theme">("profile");
  const [disappearing, setDisappearing] = useState(false);

  const unfriend = useMutation(api.friends.unfriend);
  const blockUser = useMutation(api.friends.blockUser);
  const unblockUser = useMutation(api.friends.unblockUser);

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat ? { userId: activeChat.userId as never } : "skip",
  );

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip",
  );

  const blockedUsers = useQuery(
    api.friends.getBlockedUsers,
    userId ? { userId } : "skip",
  );

  if (!activeChat) return null;

  const friendship = friends?.find((f) => f?.userId === activeChat.userId);
  const blockRecord = blockedUsers?.find((b) => b.userId === activeChat.userId);
  const iBlockedThem = !!blockRecord;
  const hasBlockedMe = friendship?.hasBlockedMe ?? false;

  async function handleUnfriend() {
    if (!friendship) return;
    try {
      await unfriend({ friendshipId: friendship.friendshipId as never });
      toast.success(`Unfriended ${activeChat!.username}!`);
      clearActiveChat();
    } catch {
      toast.error("Failed to unfriend.");
    }
  }

  async function handleBlock() {
    if (!userId) return;
    try {
      await blockUser({
        blockerId: userId,
        blockedId: activeChat!.userId as never,
      });
      toast.success(`Blocked ${activeChat!.username}!`);
      setProfilePanelOpen(false);
    } catch {
      toast.error("Failed to block.");
    }
  }

  async function handleUnblock() {
    if (!blockRecord) return;
    try {
      await unblockUser({ recordId: blockRecord.recordId as never });
      toast.success(`Unblocked ${activeChat!.username}!`);
      setProfilePanelOpen(false);
    } catch {
      toast.error("Failed to unblock.");
    }
  }

  if (view === "theme") {
    return <ChatThemeCustomizer onBack={() => setView("profile")} />;
  }

  return (
    <div className="flex flex-col h-full bg-sidebar animate-in slide-in-from-left-4 duration-300">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <h2 className="text-foreground font-bold text-sm">Profile</h2>
        <button
          onClick={() => setProfilePanelOpen(false)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-3 py-6 px-4">
          <UserAvatar
            username={activeChat.username}
            profilePicStorageId={
              otherUser?.profilePicStorageId as Id<"_storage"> | null
            }
            size="lg"
            isOnline={activeChat.isOnline}
            isGrayedOut={iBlockedThem || hasBlockedMe}
          />
          <div className="text-center">
            <p className="text-foreground font-bold text-lg">
              {activeChat.username}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              @{activeChat.username}
            </p>
            <p
              className={`text-xs font-medium mt-1 ${
                activeChat.isOnline
                  ? "text-emerald-500"
                  : "text-muted-foreground"
              }`}
            >
              {activeChat.isOnline ? "Online" : "Offline"}
            </p>
          </div>

          {hasBlockedMe && (
            <span className="bg-destructive/10 text-destructive text-xs font-bold px-3 py-1 rounded-full">
              Blocked you
            </span>
          )}
          {iBlockedThem && (
            <span className="bg-destructive/10 text-destructive text-xs font-bold px-3 py-1 rounded-full">
              You blocked this user
            </span>
          )}
        </div>

        <div className="h-px bg-border mx-4 mb-4" />

        {otherUser?.bio && (
          <>
            <div className="px-4 mb-4">
              <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider mb-2">
                Bio
              </p>
              <p className="text-foreground text-sm leading-relaxed">
                {otherUser.bio}
              </p>
            </div>
            <div className="h-px bg-border mx-4 mb-4" />
          </>
        )}

        <div className="px-4 mb-4">
          <button
            onClick={() => setView("theme")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Palette size={16} className="text-primary" />
              </div>
              <span className="text-foreground font-semibold text-sm">
                Customize Chat Theme
              </span>
            </div>
          </button>
        </div>

        <div className="px-4 mb-4">
          <button
            onClick={() => {
              setDisappearing(!disappearing);
              toast.success(
                disappearing
                  ? "Disappearing messages off"
                  : "Disappearing messages on — coming in Step 11!",
              );
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Timer size={16} className="text-primary" />
              </div>
              <span className="text-foreground font-semibold text-sm">
                Disappearing Messages
              </span>
            </div>

            <div
              className={`w-10 h-6 rounded-full transition-colors ${
                disappearing ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full mt-1 transition-all ${
                  disappearing ? "ml-5" : "ml-1"
                }`}
              />
            </div>
          </button>
        </div>

        <div className="h-px bg-border mx-4 mb-4" />

        <div className="px-4 pb-6 flex flex-col gap-2">
          {friendship && (
            <button
              onClick={handleUnfriend}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent hover:bg-destructive/10 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <UserX size={16} className="text-destructive" />
              </div>
              <span className="text-destructive font-semibold text-sm">
                Unfriend
              </span>
            </button>
          )}

          {iBlockedThem ? (
            <button
              onClick={handleUnblock}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ShieldOff size={16} className="text-primary" />
              </div>
              <span className="text-foreground font-semibold text-sm">
                Unblock
              </span>
            </button>
          ) : (
            <button
              onClick={handleBlock}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent hover:bg-destructive/10 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <Shield size={16} className="text-destructive" />
              </div>
              <span className="text-destructive font-semibold text-sm">
                Block
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
