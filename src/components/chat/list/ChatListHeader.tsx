// src/components/chat/list/ChatListHeader.tsx
import {
  Search,
  Plus,
  X,
  ArrowLeft,
  Trash2,
  Pin,
  LockOpen,
} from "lucide-react";
import DotsMenu from "@/components/sidebar/DotsMenu";
import ConfirmModal from "@/components/shared/ConfirmModal";

interface ChatListHeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  onNewChat: () => void;
  onSettingsClick: () => void;
  isSelectionMode: boolean;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onPin: () => void;
  onDelete: () => void;
  onCancelSelect: () => void;
  onLockClick: () => void;
}

export default function ChatListHeader({
  search,
  onSearchChange,
  onNewChat,
  onSettingsClick,
  isSelectionMode,
  selectedCount,
  allSelected,
  onSelectAll,
  onPin,
  onDelete,
  onCancelSelect,
  onLockClick,
}: ChatListHeaderProps) {
  return (
    <>
      {isSelectionMode ? (
        <div className="flex items-center justify-between px-4 pt-4 pb-2 bg-accent/30 border-b border-border/40">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancelSelect}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors -ml-1"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-foreground font-bold text-[16px]">
              {selectedCount} Selected
            </h2>
          </div>
          <button
            onClick={onSelectAll}
            className="text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-foreground font-bold text-lg">Chats</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onLockClick}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              title="Lock App"
            >
              <LockOpen size={16} />
            </button>
            <button
              onClick={onNewChat}
              className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
              title="New Chat"
            >
              <Plus size={18} />
            </button>
            <DotsMenu onSettingsClick={onSettingsClick} />
          </div>
        </div>
      )}

      <div className="px-3 pb-3 mt-1.5">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats..."
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

      {isSelectionMode && selectedCount > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around animate-in slide-in-from-bottom-5 z-20">
          {selectedCount > 3 ? (
            <div
              className="flex flex-col items-center gap-1.5 text-muted-foreground opacity-40 cursor-not-allowed"
              title="You can only pin up to 3 chats"
            >
              <Pin size={20} />
              <span className="text-[11px] font-semibold">Max 3 Pins</span>
            </div>
          ) : (
            <button
              onClick={onPin}
              className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Pin size={20} />
              <span className="text-[11px] font-semibold">Pin/Unpin</span>
            </button>
          )}

          <ConfirmModal
            title="Delete Chats?"
            description={`Are you sure you want to delete ${selectedCount} selected chat(s)? This action cannot be undone.`}
            isDestructive={true}
            confirmText="Delete"
            onConfirm={onDelete}
          >
            <button className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={20} />
              <span className="text-[11px] font-semibold">Delete</span>
            </button>
          </ConfirmModal>
        </div>
      )}
    </>
  );
}
