//src/components/chat/BubbleMenu.tsx
import { useState } from "react";
import { toast } from "sonner";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  ChevronDown,
  Reply,
  Copy,
  CheckSquare,
  Pencil,
  Trash2,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BubbleMenuProps {
  messageId: string;
  text: string;
  type: string;
  isOwn: boolean;
  senderName?: string;
  sentAt?: number;
  onSelect?: () => void;
}

export default function BubbleMenu({
  messageId,
  text,
  type,
  isOwn,
  senderName = "User",
  sentAt = 0,
  onSelect,
}: BubbleMenuProps) {
  const { setSelectedMessageForInfo, setReplyingTo, setEditingMessage } = useChatStore();
  const userId = useAuthStore((s) => s.userId);

  const deleteMessageForMe = useMutation(api.messages.deleteMessageForMe);
  const deleteMessageForEveryone = useMutation(api.messages.deleteMessageForEveryone);

  // Modal State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Time Validation: 1 Ghanta (3600000 milliseconds)
  const ONE_HOUR = 60 * 60 * 1000;
  const isEligibleForEveryone = isOwn && (Date.now() - sentAt) < ONE_HOUR;
  const isEligibleForEdit = isOwn && type === "text" && (Date.now() - sentAt) < ONE_HOUR; // ── FIX: Edit Limit ──

  const handleDeleteForMe = async () => {
    if (!userId) return;
    try {
      await deleteMessageForMe({ messageId: messageId as Id<"messages">, userId: userId as Id<"users"> });
      toast.success("Message deleted for you");
      setIsDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!userId) return;
    try {
      await deleteMessageForEveryone({ messageId: messageId as Id<"messages">, userId: userId as Id<"users"> });
      toast.success("Message deleted for everyone");
      setIsDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete message");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`
            p-0.5 rounded-full flex items-center justify-center transition-colors focus:outline-none
            ${
              isOwn
                ? "bg-primary text-primary-foreground hover:bg-black/10 dark:hover:bg-white/10"
                : "bg-secondary text-secondary-foreground hover:bg-black/10 dark:hover:bg-white/10"
            }
          `}
        >
          <ChevronDown className="w-4 h-4 opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isOwn ? "end" : "start"}
        className="w-48 shadow-lg rounded-xl"
      >
       <DropdownMenuItem 
          className="cursor-pointer rounded-lg py-2"
          onClick={() => setReplyingTo({ id: messageId, text, senderName, type })}
        >
          <Reply className="w-4 h-4 mr-2 text-muted-foreground" /> Reply
        </DropdownMenuItem>
        
        {type === "text" && (
          <DropdownMenuItem
            className="cursor-pointer rounded-lg py-2"
            onClick={() => {
              navigator.clipboard.writeText(text);
              toast.success("Copied!");
            }}
          >
            <Copy className="w-4 h-4 mr-2 text-muted-foreground" /> Copy
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem
          className="cursor-pointer rounded-lg py-2"
          onClick={() => onSelect?.()}
        >
          <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground" /> Select
        </DropdownMenuItem>

        {isOwn && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg py-2"
              onClick={() => setSelectedMessageForInfo({ id: messageId, text })}
            >
              <Info className="w-4 h-4 mr-2 text-muted-foreground" /> Info
            </DropdownMenuItem>
            {isEligibleForEdit && (
              <DropdownMenuItem 
                className="cursor-pointer rounded-lg py-2"
                onClick={() => setEditingMessage({ id: messageId, text })}
              >
                <Pencil className="w-4 h-4 mr-2 text-muted-foreground" /> Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </>
        )}

        {!isOwn && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>

      {/* ── PROFESSIONAL DELETE MODAL ── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl shadow-xl border-border sm:max-w-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-bold">Delete Message?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-[15px] leading-relaxed">
              {isEligibleForEveryone 
                ? "You can delete this message for everyone or just for yourself." 
                : "Are you sure you want to delete this message for yourself? This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <button 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent border border-transparent hover:border-border transition-colors w-full sm:w-auto text-foreground"
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteForMe}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-transparent hover:bg-accent transition-colors w-full sm:w-auto text-foreground"
            >
              Delete for me
            </button>
            {isEligibleForEveryone && (
              <button 
                onClick={handleDeleteForEveryone}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors w-full sm:w-auto"
              >
                Delete for everyone
              </button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DropdownMenu>
  );
}
