// src/components/chat/input/ChatInputStatusBars.tsx
import { Shield, ShieldOff, UserX } from "lucide-react";

interface ChatInputStatusBarsProps {
  selectMode: boolean;
  selectedCount: number;
  onCancelSelect?: () => void;
  onDeleteSelected?: () => void;
  hasBlockedMe: boolean;
  iBlockedThem: boolean;
  isLoading: boolean;
  areFriends: boolean;
  activeChatUsername?: string;
}

export default function ChatInputStatusBars({
  selectMode,
  selectedCount,
  onCancelSelect,
  onDeleteSelected,
  hasBlockedMe,
  iBlockedThem,
  isLoading,
  areFriends,
  activeChatUsername,
}: ChatInputStatusBarsProps) {
  if (selectMode) {
    return (
      <div className="px-4 py-3 bg-sidebar border-t border-border transition-colors duration-300">
        <div className="flex items-center justify-between bg-accent rounded-2xl px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            {selectedCount} message{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancelSelect}
              className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-background rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDeleteSelected}
              className="px-4 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasBlockedMe) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            <span className="text-foreground font-semibold">
              {activeChatUsername}
            </span>{" "}
            has blocked you
          </p>
        </div>
      </div>
    );
  }

  if (iBlockedThem) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <ShieldOff size={16} className="text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            You blocked{" "}
            <span className="text-foreground font-semibold">
              {activeChatUsername}
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center h-12">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!areFriends) {
    return (
      <div className="px-4 py-4 bg-sidebar border-t border-border">
        <div className="flex items-center justify-center gap-3 bg-accent/50 rounded-2xl px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <UserX size={16} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            You and{" "}
            <span className="text-foreground font-semibold">
              {activeChatUsername}
            </span>{" "}
            are no longer friends
          </p>
        </div>
      </div>
    );
  }

  return null;
}
