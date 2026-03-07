//src/components/profile/OtherUserPanel.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Id } from "../../../convex/_generated/dataModel";
import UserAvatar from "@/components/shared/UserAvatar";
import { X, UserX, Shield, ShieldOff, Timer, Palette } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import ChatThemeCustomizer from "@/components/chat/ChatThemeCustomizer";
import DisappearingPicker from "@/components/chat/DisappearingPicker";
import ConfirmModal from "@/components/shared/ConfirmModal";

export default function OtherUserPanel() {
  const { activeChat, setProfilePanelOpen, clearActiveChat } = useChatStore();
  const userId = useAuthStore((s) => s.userId);

  const [view, setView] = useState<"profile" | "theme" | "disappearing">("profile");
  const [disappearing, setDisappearing] = useState(false);
  
  // ── Polling trigger - har 2 seconds mein status check kar ──
  const [pollTrigger, setPollTrigger] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPollTrigger((prev) => prev + 1);
    }, 2000); // 2 second polling

    return () => clearInterval(interval);
  }, []);

  const unfriend = useMutation(api.friends.unfriend);
  const blockUser = useMutation(api.friends.blockUser);
  const unblockUser = useMutation(api.friends.unblockUser);

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat ? { userId: activeChat.userId as never } : "skip"
  );

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId } : "skip"
  );

  const blockedUsers = useQuery(
    api.friends.getBlockedUsers,
    userId ? { userId } : "skip"
  );

  // Force dependency on pollTrigger
  useEffect(() => {}, [pollTrigger]);

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

  if (view === "disappearing") {
    return <DisappearingPicker onBack={() => setView("profile")} />;
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
            isOnline={otherUser?.isOnline ?? activeChat.isOnline}
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
                (otherUser?.isOnline ?? activeChat.isOnline)
                  ? "text-emerald-500"
                  : "text-muted-foreground"
              }`}
            >
              {(otherUser?.isOnline ?? activeChat.isOnline) ? "Online" : "Offline"}
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
            onClick={() => setView("disappearing")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Timer size={16} className="text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-foreground font-semibold text-sm">
                  Disappearing Messages
                </span>
                {activeChat.disappearingMode && (
                  <span className="text-xs text-primary font-medium">
                    {activeChat.disappearingTimer === "1h" ? "1 hour"
                      : activeChat.disappearingTimer === "6h" ? "6 hours"
                      : activeChat.disappearingTimer === "12h" ? "12 hours"
                      : activeChat.disappearingTimer === "1d" ? "1 day"
                      : activeChat.disappearingTimer === "3d" ? "3 days"
                      : activeChat.disappearingTimer === "7d" ? "7 days"
                      : "On"}
                  </span>
                )}
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${activeChat.disappearingMode ? "bg-primary" : "bg-muted-foreground/30"}`} />
          </button>
        </div>

        <div className="h-px bg-border mx-4 mb-4" />

        <div className="px-4 pb-6 flex flex-col gap-2">
          {friendship && (
            <ConfirmModal
              title={`Unfriend ${activeChat.username}?`}
              description="Are you sure you want to remove them from your friends list? You will no longer be able to see their private updates."
              onConfirm={handleUnfriend}
              confirmText="Unfriend"
              isDestructive={true}
            >
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent hover:bg-destructive/10 transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                  <UserX size={16} className="text-destructive" />
                </div>
                <span className="text-destructive font-semibold text-sm">
                  Unfriend
                </span>
              </button>
            </ConfirmModal>
          )}

          {iBlockedThem ? (
            <ConfirmModal
              title={`Unblock ${activeChat.username}?`}
              description="They will be able to send you messages, call you, and see your profile again."
              onConfirm={handleUnblock}
              confirmText="Unblock"
              isDestructive={false}
            >
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent hover:bg-accent/70 transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <ShieldOff size={16} className="text-primary" />
                </div>
                <span className="text-foreground font-semibold text-sm">
                  Unblock
                </span>
              </button>
            </ConfirmModal>
          ) : (
            <ConfirmModal
              title={`Block ${activeChat.username}?`}
              description="They won't be able to send you messages, call you, or see your profile. This action can be undone later."
              onConfirm={handleBlock}
              confirmText="Block"
              isDestructive={true}
            >
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent hover:bg-destructive/10 transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                  <Shield size={16} className="text-destructive" />
                </div>
                <span className="text-destructive font-semibold text-sm">
                  Block
                </span>
              </button>
            </ConfirmModal>
          )}
        </div>
      </div>
    </div>
  );
}
