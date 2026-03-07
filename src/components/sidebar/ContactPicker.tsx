// src/components/sidebar/ContactPicker.tsx
import { useState } from "react";
import { ArrowLeft, Search, Check, X } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import UserAvatar from "@/components/shared/UserAvatar";
import { PrivacyField } from "./SettingsPanel";

interface ContactPickerProps {
  field: PrivacyField;
  selectedOption: string;
  currentExceptions: (string | null)[];
  onBack: () => void;
  onClose: () => void;
}

const HEADER_LABELS: Record<PrivacyField, string> = {
  privacyOnline: "Online Status",
  privacyTyping: "Typing Indicator",
  privacyReadReceipts: "Read Receipts",
};

export default function ContactPicker({
  field,
  selectedOption,
  currentExceptions,
  onBack,
  onClose,
}: ContactPickerProps) {
  const userId = useAuthStore((s) => s.userId);
  const updatePrivacySettings = useMutation(api.presence.updatePrivacySettings);
  
  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string | null>>(
    new Set(currentExceptions?.filter(Boolean))
  );
  const [saving, setSaving] = useState(false);

  const filteredFriends = friends?.filter((friend) =>
    friend?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function toggleContact(contactId: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedIds(newSelected);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);

    try {
      const exceptionField = 
        field === "privacyOnline" ? "onlineExceptions" :
        field === "privacyTyping" ? "typingExceptions" : 
        "readReceiptsExceptions";

      await updatePrivacySettings({
        userId: userId as Id<"users">,
        [field]: selectedOption as any,
        [exceptionField]: Array.from(selectedIds) as Id<"users">[],
      });
      
      toast.success("Privacy exceptions updated!");
      onClose(); // Save hone k baad poora modal band kardo
    } catch {
      toast.error("Failed to save exceptions");
    } finally {
      setSaving(false);
    }
  }

  const isWhitelist = selectedOption === "only_these";
  const subtitle = isWhitelist 
    ? "Share with selected contacts" 
    : "Hide from selected contacts";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="absolute inset-0" onClick={onClose} />

      {/* ── Modal Container ── */}
      <div className="relative w-full max-w-[340px] h-[500px] max-h-[85vh] flex flex-col bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-300 m-4">
        
        {/* ── Header ── */}
        <div className="flex flex-col px-4 pt-4 pb-3 border-b border-border/40 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors -ml-1"
            >
              <ArrowLeft size={18} />
            </button>
            <h3 className="font-semibold text-[15px] text-foreground">
              {HEADER_LABELS[field]}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors -mr-1"
            >
              <X size={18} />
            </button>
          </div>
          
          <p className="text-[13px] text-muted-foreground font-medium px-1">
            {subtitle}
          </p>
        </div>

        {/* ── Search Bar ── */}
        <div className="px-4 py-3 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-accent/50 hover:bg-accent border border-transparent focus:border-primary/30 focus:bg-background outline-none rounded-xl text-[14px] transition-all"
            />
          </div>
        </div>

        {/* ── Contacts List ── */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
          {friends === undefined ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 rounded-full border-[2px] border-primary border-t-transparent animate-spin" />
            </div>
          ) : filteredFriends?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <p className="text-[14px] font-medium text-foreground mb-1">No contacts found</p>
              <p className="text-[13px] text-muted-foreground">Try a different search</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFriends?.map((friend) => {
                if (!friend) return null; // PRO FIX: Null check for TypeScript
                const isSelected = Array.from(selectedIds).includes(friend.userId);

                return (
                  <button
                    key={friend.userId}
                    onClick={() => toggleContact(friend.userId)}
                    className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-accent/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        username={friend.username}
                        profilePicStorageId={friend.profilePicStorageId as Id<"_storage"> | null}
                        size="sm"
                      />
                      <span className="text-[14px] font-medium text-foreground">
                        {friend.username}
                      </span>
                    </div>

                    {/* Custom Checkbox */}
                    <div className={`w-5 h-5 mr-1 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200
                      ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"}
                    `}>
                      {isSelected && <Check size={12} strokeWidth={3} className="text-primary-foreground scale-in" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer / Save Button ── */}
        <div className="p-4 border-t border-border/40 bg-background/50 backdrop-blur-sm shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 flex items-center justify-center bg-primary hover:opacity-90 text-primary-foreground font-semibold text-[14px] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <div className="w-5 h-5 rounded-full border-[2.5px] border-primary-foreground/30 border-t-primary-foreground animate-spin" />
            ) : (
              `Save Changes (${selectedIds.size})`
            )}
          </button>
        </div>

      </div>
    </div>
  );
}